from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
import models
from .auth import get_current_user
import uuid
from datetime import datetime

router = APIRouter()

# --- Pydantic Models ---

class GoalBase(BaseModel):
    name: str
    targetAmount: float
    targetDate: Optional[str] = None
    icon: Optional[str] = "PiggyBank"
    fundingSource: Optional[str] = "manual"
    type: Optional[str] = "savings"
    projectedReturnRate: Optional[float] = 0.0

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    currentAmount: Optional[float] = None
    name: Optional[str] = None
    targetAmount: Optional[float] = None

class GoalResponse(GoalBase):
    id: str
    user_id: str
    currentAmount: float

    class Config:
        orm_mode = True

class WishlistItemBase(BaseModel):
    name: str
    cost: float

class WishlistItemCreate(WishlistItemBase):
    pass

class WishlistItemResponse(WishlistItemBase):
    id: str
    user_id: str
    addedAt: str

    class Config:
        orm_mode = True

# --- Goals Endpoints ---

@router.get("/goals", response_model=List[GoalResponse])
def get_goals(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Goal).filter(models.Goal.user_id == current_user.id).all()

@router.post("/goals", response_model=GoalResponse)
def create_goal(goal: GoalCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_goal = models.Goal(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        **goal.dict()
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.put("/goals/{goal_id}", response_model=GoalResponse)
def update_goal(goal_id: str, goal_update: GoalUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id, models.Goal.user_id == current_user.id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    update_data = goal_update.dict(exclude_unset=True)
    
    # Special handling for currentAmount to allow increments/decrements if passed as delta? 
    # For now, we assume the frontend sends the NEW total amount, OR we handle logic there.
    # Let's stick to simple update for now.
    
    for key, value in update_data.items():
        setattr(db_goal, key, value)
    
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id, models.Goal.user_id == current_user.id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db.delete(db_goal)
    db.commit()
    return {"message": "Goal deleted"}

# --- Wishlist Endpoints ---

@router.get("/wishlist", response_model=List[WishlistItemResponse])
def get_wishlist(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.WishlistItem).filter(models.WishlistItem.user_id == current_user.id).all()

@router.post("/wishlist", response_model=WishlistItemResponse)
def create_wishlist_item(item: WishlistItemCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_item = models.WishlistItem(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=item.name,
        cost=item.cost,
        addedAt=datetime.utcnow().isoformat()
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/wishlist/{item_id}")
def delete_wishlist_item(item_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_item = db.query(models.WishlistItem).filter(models.WishlistItem.id == item_id, models.WishlistItem.user_id == current_user.id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(db_item)
    db.commit()
    return {"message": "Item deleted"}
