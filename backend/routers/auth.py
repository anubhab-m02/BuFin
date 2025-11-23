from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import timedelta
import uuid
import models, schemas, auth_utils
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
    return user

@router.post("/signup", response_model=schemas.Token)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth_utils.get_password_hash(user.password)
    db_user = models.User(
        id=str(uuid.uuid4()),
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    access_token_expires = timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_utils.create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not auth_utils.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_utils.create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
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
    if not auth_utils.verify_password(passwords.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    current_user.hashed_password = auth_utils.get_password_hash(passwords.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@router.delete("/me")
def delete_account(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Manually delete related data since we don't have cascade set up in models (safer for now)
    db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).delete()
    db.query(models.RecurringPlan).filter(models.RecurringPlan.user_id == current_user.id).delete()
    db.query(models.Debt).filter(models.Debt.user_id == current_user.id).delete()
    db.query(models.WishlistItem).filter(models.WishlistItem.user_id == current_user.id).delete()
    
    # Delete user
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully"}
