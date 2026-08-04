from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from database import get_db
import models
from .auth import get_current_user
import uuid
import secrets
from datetime import datetime, timedelta, timezone

router = APIRouter()

INVITE_EXPIRY_DAYS = 7

# --- Pydantic Models ---

class HouseholdCreate(BaseModel):
    name: str

class HouseholdResponse(BaseModel):
    id: str
    name: str
    created_by: str
    created_at: str
    role: str  # the calling user's role in this household

    model_config = ConfigDict(from_attributes=True)

class InviteResponse(BaseModel):
    code: str
    expires_at: str

    model_config = ConfigDict(from_attributes=True)

class JoinRequest(BaseModel):
    code: str

class MemberResponse(BaseModel):
    user_id: str
    full_name: str
    email: str
    role: str
    joined_at: str

class RoleUpdate(BaseModel):
    role: str  # only 'owner' is meaningful today (promotion) - see update_member_role

# --- Helpers ---

def _get_membership(db: Session, household_id: str, user_id: str) -> Optional[models.HouseholdMember]:
    return db.query(models.HouseholdMember).filter(
        models.HouseholdMember.household_id == household_id,
        models.HouseholdMember.user_id == user_id
    ).first()

def _require_membership(db: Session, household_id: str, user_id: str) -> models.HouseholdMember:
    membership = _get_membership(db, household_id, user_id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this household")
    return membership

def _require_owner(db: Session, household_id: str, user_id: str) -> models.HouseholdMember:
    membership = _require_membership(db, household_id, user_id)
    if membership.role != "owner":
        raise HTTPException(status_code=403, detail="Only a household owner can do this")
    return membership

def _is_sole_owner(db: Session, household_id: str, user_id: str) -> bool:
    owners = db.query(models.HouseholdMember).filter(
        models.HouseholdMember.household_id == household_id,
        models.HouseholdMember.role == "owner"
    ).all()
    return len(owners) == 1 and owners[0].user_id == user_id

def _delete_household(db: Session, household_id: str):
    db.query(models.HouseholdInvite).filter(models.HouseholdInvite.household_id == household_id).delete()
    db.query(models.HouseholdMember).filter(models.HouseholdMember.household_id == household_id).delete()
    db.query(models.Household).filter(models.Household.id == household_id).delete()

# --- Endpoints ---

@router.post("/households", response_model=HouseholdResponse)
def create_household(household: HouseholdCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    db_household = models.Household(
        id=str(uuid.uuid4()),
        name=household.name,
        created_by=current_user.id,
        created_at=now
    )
    db.add(db_household)
    db.add(models.HouseholdMember(
        id=str(uuid.uuid4()),
        household_id=db_household.id,
        user_id=current_user.id,
        role="owner",
        joined_at=now
    ))
    db.commit()
    db.refresh(db_household)
    return HouseholdResponse(id=db_household.id, name=db_household.name, created_by=db_household.created_by, created_at=db_household.created_at, role="owner")

@router.get("/households", response_model=List[HouseholdResponse])
def get_households(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    memberships = db.query(models.HouseholdMember).filter(models.HouseholdMember.user_id == current_user.id).all()
    households = []
    for m in memberships:
        h = db.query(models.Household).filter(models.Household.id == m.household_id).first()
        if h:
            households.append(HouseholdResponse(id=h.id, name=h.name, created_by=h.created_by, created_at=h.created_at, role=m.role))
    return households

@router.post("/households/{household_id}/invites", response_model=InviteResponse)
def create_invite(household_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    _require_owner(db, household_id, current_user.id)

    expires_at = (datetime.now(timezone.utc) + timedelta(days=INVITE_EXPIRY_DAYS)).isoformat()
    # Collision odds on an 8-char hex code are negligible, but retry a few times rather
    # than trusting that rather than letting a freak collision surface as a 500.
    for _ in range(5):
        code = secrets.token_hex(4).upper()
        invite = models.HouseholdInvite(
            id=str(uuid.uuid4()),
            household_id=household_id,
            code=code,
            created_by=current_user.id,
            expires_at=expires_at,
            used_by=None,
            created_at=datetime.now(timezone.utc).isoformat()
        )
        db.add(invite)
        try:
            db.commit()
            return InviteResponse(code=code, expires_at=expires_at)
        except IntegrityError:
            db.rollback()
    raise HTTPException(status_code=500, detail="Could not generate a unique invite code, try again")

@router.post("/households/join", response_model=HouseholdResponse)
def join_household(join: JoinRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    invite = db.query(models.HouseholdInvite).filter(models.HouseholdInvite.code == join.code.strip().upper()).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    if invite.used_by:
        raise HTTPException(status_code=400, detail="This invite has already been used")
    if datetime.fromisoformat(invite.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This invite has expired")

    if _get_membership(db, invite.household_id, current_user.id):
        raise HTTPException(status_code=400, detail="You're already a member of this household")

    db.add(models.HouseholdMember(
        id=str(uuid.uuid4()),
        household_id=invite.household_id,
        user_id=current_user.id,
        role="member",
        joined_at=datetime.now(timezone.utc).isoformat()
    ))
    invite.used_by = current_user.id
    db.commit()

    household = db.query(models.Household).filter(models.Household.id == invite.household_id).first()
    return HouseholdResponse(id=household.id, name=household.name, created_by=household.created_by, created_at=household.created_at, role="member")

@router.get("/households/{household_id}/members", response_model=List[MemberResponse])
def get_members(household_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    _require_membership(db, household_id, current_user.id)

    members = db.query(models.HouseholdMember).filter(models.HouseholdMember.household_id == household_id).all()
    result = []
    for m in members:
        user = db.query(models.User).filter(models.User.id == m.user_id).first()
        if user:
            result.append(MemberResponse(user_id=user.id, full_name=user.full_name, email=user.email, role=m.role, joined_at=m.joined_at))
    return result

@router.put("/households/{household_id}/members/{user_id}/role", response_model=MemberResponse)
def update_member_role(household_id: str, user_id: str, role_update: RoleUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    _require_owner(db, household_id, current_user.id)
    if role_update.role not in ("owner", "member"):
        raise HTTPException(status_code=400, detail="role must be 'owner' or 'member'")

    target = _get_membership(db, household_id, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    # Demoting the sole owner would strand the household - they must promote someone
    # else to owner first (this endpoint), then demote themselves in a second call.
    if role_update.role == "member" and target.user_id == current_user.id and _is_sole_owner(db, household_id, target.user_id):
        raise HTTPException(status_code=400, detail="Promote another member to owner before stepping down")

    target.role = role_update.role
    db.commit()

    user = db.query(models.User).filter(models.User.id == target.user_id).first()
    return MemberResponse(user_id=user.id, full_name=user.full_name, email=user.email, role=target.role, joined_at=target.joined_at)

@router.delete("/households/{household_id}/members/{user_id}")
def remove_member(household_id: str, user_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    _require_owner(db, household_id, current_user.id)

    target = _get_membership(db, household_id, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    if target.role == "owner" and _is_sole_owner(db, household_id, target.user_id):
        raise HTTPException(status_code=400, detail="Cannot remove the only owner - promote another member to owner first, or delete the household")

    db.delete(target)
    db.commit()
    return {"message": "Member removed"}

@router.post("/households/{household_id}/leave")
def leave_household(household_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    membership = _require_membership(db, household_id, current_user.id)

    member_count = db.query(models.HouseholdMember).filter(models.HouseholdMember.household_id == household_id).count()

    if membership.role == "owner" and _is_sole_owner(db, household_id, current_user.id):
        if member_count > 1:
            raise HTTPException(status_code=400, detail="Promote another member to owner before leaving")
        # Sole owner and the only member left - leaving is equivalent to deleting the
        # household outright, so do that instead of stranding an empty, ownerless row.
        _delete_household(db, household_id)
        db.commit()
        return {"message": "Household deleted (you were the last member)"}

    db.delete(membership)
    db.commit()
    return {"message": "Left household"}

@router.delete("/households/{household_id}")
def delete_household(household_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    _require_owner(db, household_id, current_user.id)
    _delete_household(db, household_id)
    db.commit()
    return {"message": "Household deleted"}
