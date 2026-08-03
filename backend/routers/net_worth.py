from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from database import get_db
import models
from .auth import get_current_user
import uuid
from datetime import datetime, timezone

router = APIRouter()

# --- Pydantic Models ---

class AssetBase(BaseModel):
    name: str
    category: str
    current_value: float

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    current_value: Optional[float] = None

class AssetResponse(AssetBase):
    id: str
    user_id: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)

class LiabilityBase(BaseModel):
    name: str
    category: str
    current_balance: float

class LiabilityCreate(LiabilityBase):
    pass

class LiabilityUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    current_balance: Optional[float] = None

class LiabilityResponse(LiabilityBase):
    id: str
    user_id: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)

class NetWorthSnapshotResponse(BaseModel):
    id: str
    user_id: str
    total_assets: float
    total_liabilities: float
    recorded_at: str

    model_config = ConfigDict(from_attributes=True)

# --- Snapshot Helper ---

def _record_snapshot(db: Session, user_id: str):
    # Net worth is a point-in-time calculation with no history of its own, so a snapshot
    # row is written on every asset/liability mutation - this is the only thing that
    # gives the trend chart real history instead of a single flat point.
    total_assets = sum(a.current_value for a in db.query(models.Asset).filter(models.Asset.user_id == user_id).all())
    total_liabilities = sum(l.current_balance for l in db.query(models.Liability).filter(models.Liability.user_id == user_id).all())
    snapshot = models.NetWorthSnapshot(
        id=str(uuid.uuid4()),
        user_id=user_id,
        total_assets=total_assets,
        total_liabilities=total_liabilities,
        recorded_at=datetime.now(timezone.utc).isoformat()
    )
    db.add(snapshot)
    db.commit()

# --- Asset Endpoints ---

@router.get("/net-worth/assets", response_model=List[AssetResponse])
def get_assets(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Asset).filter(models.Asset.user_id == current_user.id).all()

@router.post("/net-worth/assets", response_model=AssetResponse)
def create_asset(asset: AssetCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_asset = models.Asset(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        created_at=datetime.now(timezone.utc).isoformat(),
        **asset.dict()
    )
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    _record_snapshot(db, current_user.id)
    return db_asset

@router.put("/net-worth/assets/{asset_id}", response_model=AssetResponse)
def update_asset(asset_id: str, asset_update: AssetUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id, models.Asset.user_id == current_user.id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    for key, value in asset_update.dict(exclude_unset=True).items():
        setattr(db_asset, key, value)

    db.commit()
    db.refresh(db_asset)
    _record_snapshot(db, current_user.id)
    return db_asset

@router.delete("/net-worth/assets/{asset_id}")
def delete_asset(asset_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id, models.Asset.user_id == current_user.id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    db.delete(db_asset)
    db.commit()
    _record_snapshot(db, current_user.id)
    return {"message": "Asset deleted"}

# --- Liability Endpoints ---

@router.get("/net-worth/liabilities", response_model=List[LiabilityResponse])
def get_liabilities(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Liability).filter(models.Liability.user_id == current_user.id).all()

@router.post("/net-worth/liabilities", response_model=LiabilityResponse)
def create_liability(liability: LiabilityCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_liability = models.Liability(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        created_at=datetime.now(timezone.utc).isoformat(),
        **liability.dict()
    )
    db.add(db_liability)
    db.commit()
    db.refresh(db_liability)
    _record_snapshot(db, current_user.id)
    return db_liability

@router.put("/net-worth/liabilities/{liability_id}", response_model=LiabilityResponse)
def update_liability(liability_id: str, liability_update: LiabilityUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_liability = db.query(models.Liability).filter(models.Liability.id == liability_id, models.Liability.user_id == current_user.id).first()
    if not db_liability:
        raise HTTPException(status_code=404, detail="Liability not found")

    for key, value in liability_update.dict(exclude_unset=True).items():
        setattr(db_liability, key, value)

    db.commit()
    db.refresh(db_liability)
    _record_snapshot(db, current_user.id)
    return db_liability

@router.delete("/net-worth/liabilities/{liability_id}")
def delete_liability(liability_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_liability = db.query(models.Liability).filter(models.Liability.id == liability_id, models.Liability.user_id == current_user.id).first()
    if not db_liability:
        raise HTTPException(status_code=404, detail="Liability not found")

    db.delete(db_liability)
    db.commit()
    _record_snapshot(db, current_user.id)
    return {"message": "Liability deleted"}

# --- Snapshot Endpoint ---

@router.get("/net-worth/snapshots", response_model=List[NetWorthSnapshotResponse])
def get_snapshots(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return (
        db.query(models.NetWorthSnapshot)
        .filter(models.NetWorthSnapshot.user_id == current_user.id)
        .order_by(models.NetWorthSnapshot.recorded_at)
        .all()
    )
