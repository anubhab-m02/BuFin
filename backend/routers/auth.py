from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional
import uuid
import models, schemas, auth_utils, rate_limit
from database import get_db

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth_utils.jwt.decode(token, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except auth_utils.JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    # A token is only valid for the version it was issued under; changing the password bumps the
    # user's version and so revokes every earlier token. Tokens issued before this claim existed
    # carry no "tv" and count as version 0, so the upgrade itself signs nobody out.
    if payload.get("tv", 0) != (user.token_version or 0):
        raise credentials_exception
    return user

# Which "persona" (personal vs a specific household) the request is acting as. Sent as a
# header rather than baked into the JWT, since the JWT isn't reissued on persona switch -
# a header lets the frontend switch personas instantly without a fresh login/token refresh.
def get_active_household_id(
    x_household_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
) -> Optional[str]:
    if not x_household_id:
        return None
    membership = db.query(models.HouseholdMember).filter(
        models.HouseholdMember.household_id == x_household_id,
        models.HouseholdMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this household")
    return x_household_id

@router.post("/signup", response_model=schemas.Token)
def signup(request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    client = rate_limit.client_key(request)
    rate_limit.signups_by_client.check(client)
    rate_limit.signups_by_client.record(client)

    # Emails are case-insensitive: stored lowercase, and looked up that way, so "A@x.com" and
    # "a@x.com" cannot be two accounts.
    email = user.email.strip().lower()
    db_user = db.query(models.User).filter(func.lower(models.User.email) == email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = auth_utils.get_password_hash(user.password)
    db_user = models.User(
        id=str(uuid.uuid4()),
        email=email,
        hashed_password=hashed_password,
        full_name=user.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    access_token_expires = timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_utils.create_access_token(
        data={"sub": db_user.email, "tv": db_user.token_version or 0}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=schemas.Token)
def login(request: Request, user: schemas.UserLogin, db: Session = Depends(get_db)):
    client = rate_limit.client_key(request)
    email = user.email.strip().lower()
    # Five wrong passwords for one account from one client lock that pair out for 15 minutes
    # (even the right password is refused meanwhile); a separate, looser cap stops one client
    # from guessing across many accounts.
    pair = f"{client}|{email}"
    rate_limit.login_failures.check(pair)
    rate_limit.login_failures_by_client.check(client)

    db_user = db.query(models.User).filter(func.lower(models.User.email) == email).first()
    # An unknown email still pays for one bcrypt check, so response time does not reveal which
    # emails have accounts.
    stored_hash = db_user.hashed_password if db_user else auth_utils.DUMMY_PASSWORD_HASH
    password_ok = auth_utils.verify_password(user.password, stored_hash)
    if not db_user or not password_ok:
        rate_limit.login_failures.record(pair)
        rate_limit.login_failures_by_client.record(client)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    rate_limit.login_failures.reset(pair)

    access_token_expires = timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_utils.create_access_token(
        data={"sub": db_user.email, "tv": db_user.token_version or 0}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.User)
def update_user_me(user_update: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Update fields
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.currency is not None:
        current_user.currency = user_update.currency
    if user_update.monthly_income is not None:
        current_user.monthly_income = user_update.monthly_income
    if user_update.current_balance is not None:
        current_user.current_balance = user_update.current_balance
    if user_update.savings_goal is not None:
        current_user.savings_goal = user_update.savings_goal
    if user_update.financial_literacy is not None:
        current_user.financial_literacy = user_update.financial_literacy
    if user_update.risk_tolerance is not None:
        current_user.risk_tolerance = user_update.risk_tolerance
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/change-password")
def change_password(passwords: schemas.UserChangePassword, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # A stolen session must not be able to guess the current password at full speed.
    rate_limit.password_change_failures.check(current_user.id)
    if not auth_utils.verify_password(passwords.old_password, current_user.hashed_password):
        rate_limit.password_change_failures.record(current_user.id)
        raise HTTPException(status_code=400, detail="Incorrect old password")
    rate_limit.password_change_failures.reset(current_user.id)

    current_user.hashed_password = auth_utils.get_password_hash(passwords.new_password)
    # Revoke every token issued so far (a stolen one included). This request's own session
    # continues with the fresh token returned below.
    current_user.token_version = (current_user.token_version or 0) + 1
    db.commit()
    access_token = auth_utils.create_access_token(
        data={"sub": current_user.email, "tv": current_user.token_version},
        expires_delta=timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"message": "Password updated successfully", "access_token": access_token, "token_type": "bearer"}

@router.delete("/me")
def delete_account(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Deferred import: households.py imports get_current_user from this module at load
    # time, so importing it back at module scope here would be circular.
    from .households import _is_sole_owner, _delete_household

    # Same guard leave_household uses: don't let a sole owner strand a household that
    # still has other members in it. Unlike leaving, deleting your account can't just be
    # blocked forever, so surface which household(s) need attention before proceeding.
    memberships = db.query(models.HouseholdMember).filter(models.HouseholdMember.user_id == current_user.id).all()
    solo_households_to_delete = []
    for m in memberships:
        if m.role != "owner" or not _is_sole_owner(db, m.household_id, current_user.id):
            continue
        other_members = db.query(models.HouseholdMember).filter(
            models.HouseholdMember.household_id == m.household_id,
            models.HouseholdMember.user_id != current_user.id
        ).count()
        if other_members > 0:
            household = db.query(models.Household).filter(models.Household.id == m.household_id).first()
            raise HTTPException(
                status_code=400,
                detail=f"You're the only owner of '{household.name if household else 'a household'}' and other members are still in it. Promote another member to owner (or remove them) before deleting your account."
            )
        # Sole owner AND sole member - nothing to strand, this household is about to be
        # fully orphaned by this deletion, so it gets deleted outright below instead.
        solo_households_to_delete.append(m.household_id)

    uid = current_user.id

    # A household the leaver is alone in goes away entirely, including its rows: nobody else
    # can be relying on them. Done first so those rows are not mistaken for shared ones below.
    for household_id in solo_households_to_delete:
        # Only the leaver's rows (and rows already anonymized by an earlier deletion) go. Rows
        # from members who left earlier still belong to them: _delete_household reverts those
        # to personal instead of deleting them.
        goal_ids = [
            g.id for g in db.query(models.Goal.id).filter(
                models.Goal.household_id == household_id,
                or_(models.Goal.user_id == uid, models.Goal.user_id.is_(None)),
            )
        ]
        if goal_ids:
            db.query(models.GoalContribution).filter(models.GoalContribution.goal_id.in_(goal_ids)).delete(synchronize_session=False)
            db.query(models.Goal).filter(models.Goal.id.in_(goal_ids)).delete(synchronize_session=False)
        db.query(models.Transaction).filter(
            models.Transaction.household_id == household_id,
            or_(models.Transaction.user_id == uid, models.Transaction.user_id.is_(None)),
        ).delete(synchronize_session=False)
        _delete_household(db, household_id)

    # Household rows that other members still use stay, anonymized (user_id NULL): the shared
    # ledger and balances must not change because one member left. recurring_plan_id and
    # linked_debt_id point at the leaver's own plans/debts, which are deleted below.
    db.query(models.Transaction).filter(
        models.Transaction.user_id == uid, models.Transaction.household_id.isnot(None)
    ).update({"user_id": None, "recurring_plan_id": None, "linked_debt_id": None}, synchronize_session=False)
    db.query(models.Goal).filter(
        models.Goal.user_id == uid, models.Goal.household_id.isnot(None)
    ).update({"user_id": None}, synchronize_session=False)

    # Other users' rows may still point at the leaver's debts/plans (older data could link any debt);
    # clear those pointers or the deletes below violate foreign keys.
    leaver_debt_ids = [d.id for d in db.query(models.Debt.id).filter(models.Debt.user_id == uid)]
    if leaver_debt_ids:
        db.query(models.Transaction).filter(models.Transaction.linked_debt_id.in_(leaver_debt_ids)).update({"linked_debt_id": None}, synchronize_session=False)
    leaver_plan_ids = [p.id for p in db.query(models.RecurringPlan.id).filter(models.RecurringPlan.user_id == uid)]
    if leaver_plan_ids:
        db.query(models.Transaction).filter(models.Transaction.recurring_plan_id.in_(leaver_plan_ids)).update({"recurring_plan_id": None}, synchronize_session=False)

    # Everything else is purely personal and is deleted (no cascade is configured in the models).
    personal_goal_ids = [g.id for g in db.query(models.Goal.id).filter(models.Goal.user_id == uid)]
    if personal_goal_ids:
        db.query(models.GoalContribution).filter(models.GoalContribution.goal_id.in_(personal_goal_ids)).delete(synchronize_session=False)
    db.query(models.GoalContribution).filter(models.GoalContribution.user_id == uid).update({"user_id": None}, synchronize_session=False)
    db.query(models.Goal).filter(models.Goal.user_id == uid).delete(synchronize_session=False)
    # Transactions before the plans/debts they reference.
    db.query(models.Transaction).filter(models.Transaction.user_id == uid).delete(synchronize_session=False)
    db.query(models.RecurringPlan).filter(models.RecurringPlan.user_id == uid).delete(synchronize_session=False)
    db.query(models.Debt).filter(models.Debt.user_id == uid).delete(synchronize_session=False)
    for model in (models.WishlistItem, models.Budget, models.Asset, models.Liability, models.NetWorthSnapshot):
        db.query(model).filter(model.user_id == uid).delete(synchronize_session=False)
    session_ids = [s.id for s in db.query(models.ChatSession.id).filter(models.ChatSession.user_id == uid)]
    if session_ids:
        db.query(models.ChatMessage).filter(models.ChatMessage.session_id.in_(session_ids)).delete(synchronize_session=False)
    db.query(models.ChatSession).filter(models.ChatSession.user_id == uid).delete(synchronize_session=False)

    # Invites the leaver issued go; invites they used keep existing, just without a user.
    db.query(models.HouseholdInvite).filter(models.HouseholdInvite.created_by == uid).delete(synchronize_session=False)
    db.query(models.HouseholdInvite).filter(models.HouseholdInvite.used_by == uid).update({"used_by": None}, synchronize_session=False)
    db.query(models.Household).filter(models.Household.created_by == uid).update({"created_by": None}, synchronize_session=False)
    db.query(models.HouseholdMember).filter(models.HouseholdMember.user_id == uid).delete(synchronize_session=False)

    # Delete user
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully"}
