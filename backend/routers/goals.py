from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from database import get_db
import models
from .auth import get_current_user, get_active_household_id
import uuid
from datetime import datetime, timezone

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

class GoalContributionResponse(BaseModel):
    user_id: str
    amount: float
    created_at: str

    model_config = ConfigDict(from_attributes=True)

class GoalResponse(GoalBase):
    id: str
    user_id: str
    household_id: Optional[str] = None
    currentAmount: float
    contributions: List[GoalContributionResponse] = []

    model_config = ConfigDict(from_attributes=True)

class WishlistItemBase(BaseModel):
    name: str
    cost: float

class WishlistItemCreate(WishlistItemBase):
    pass

class WishlistItemResponse(WishlistItemBase):
    id: str
    user_id: str
    addedAt: str

    model_config = ConfigDict(from_attributes=True)

# --- Helpers ---

# Same shape as transactions.py's scope filter: household scope means "every goal tagged
# to that household", personal scope means "my own untagged goals" - never a mix.
def _scope_filter(current_user: models.User, household_id: Optional[str]):
    if household_id:
        return models.Goal.household_id == household_id
    return and_(models.Goal.user_id == current_user.id, models.Goal.household_id.is_(None))

# Goal has no ORM relationship() to its contributions (this codebase doesn't use
# relationship() anywhere - every join is a manual filtered query), so the response has
# to be assembled explicitly rather than returned as a bare `db_goal` and left to
# from_attributes to figure out.
def _goal_response(db: Session, db_goal: models.Goal) -> GoalResponse:
    contributions = db.query(models.GoalContribution).filter(
        models.GoalContribution.goal_id == db_goal.id
    ).order_by(models.GoalContribution.created_at).all()
    return GoalResponse(
        id=db_goal.id,
        user_id=db_goal.user_id,
        household_id=db_goal.household_id,
        name=db_goal.name,
        targetAmount=db_goal.targetAmount,
        currentAmount=db_goal.currentAmount,
        targetDate=db_goal.targetDate,
        icon=db_goal.icon,
        fundingSource=db_goal.fundingSource,
        type=db_goal.type,
        projectedReturnRate=db_goal.projectedReturnRate,
        contributions=[GoalContributionResponse.model_validate(c) for c in contributions]
    )

# --- Goals Endpoints ---

@router.get("/goals", response_model=List[GoalResponse])
def get_goals(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user), active_household_id: Optional[str] = Depends(get_active_household_id)):
    goals = db.query(models.Goal).filter(_scope_filter(current_user, active_household_id)).all()
    return [_goal_response(db, g) for g in goals]

@router.post("/goals", response_model=GoalResponse)
def create_goal(goal: GoalCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user), active_household_id: Optional[str] = Depends(get_active_household_id)):
    # household_id follows the caller's active persona (the X-Household-Id header,
    # already membership-validated by get_active_household_id) rather than being a
    # client-supplied field on the goal itself - the same rule transactions.py uses, so
    # "whichever persona you're viewing" is always what new things get created under.
    db_goal = models.Goal(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        household_id=active_household_id,
        **goal.dict()
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return _goal_response(db, db_goal)

@router.put("/goals/{goal_id}", response_model=GoalResponse)
def update_goal(goal_id: str, goal_update: GoalUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user), active_household_id: Optional[str] = Depends(get_active_household_id)):
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id, _scope_filter(current_user, active_household_id)).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    update_data = goal_update.dict(exclude_unset=True)

    # The frontend sends the NEW total (goal.currentAmount + delta), not the delta
    # itself, so the delta - and who made it - has to be derived here by diffing
    # against the pre-update value, before it gets overwritten below.
    if 'currentAmount' in update_data:
        delta = update_data['currentAmount'] - db_goal.currentAmount
        if delta != 0:
            db.add(models.GoalContribution(
                id=str(uuid.uuid4()),
                goal_id=goal_id,
                user_id=current_user.id,
                amount=delta,
                created_at=datetime.now(timezone.utc).isoformat()
            ))

    for key, value in update_data.items():
        setattr(db_goal, key, value)

    db.commit()
    db.refresh(db_goal)
    return _goal_response(db, db_goal)

@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user), active_household_id: Optional[str] = Depends(get_active_household_id)):
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id, _scope_filter(current_user, active_household_id)).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    db.query(models.GoalContribution).filter(models.GoalContribution.goal_id == goal_id).delete()
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
        # Include the UTC offset.  An offset-less ISO timestamp is interpreted as
        # local time by browsers, which made the client-side 48-hour cooldown
        # start several hours early for wishlist items created by this endpoint.
        addedAt=datetime.now(timezone.utc).isoformat()
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
