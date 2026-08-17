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

class ChatSessionResponse(BaseModel):
    id: str
    mode: str
    title: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)

class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)

class ChatSessionDetailResponse(ChatSessionResponse):
    messages: List[ChatMessageResponse] = []

class ChatSessionCreate(BaseModel):
    mode: str

class ChatMessageCreate(BaseModel):
    role: str
    content: str

# --- Helpers ---

def _get_owned_session(db: Session, session_id: str, user_id: str) -> models.ChatSession:
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session

def _derive_title(content: str) -> str:
    # Truncate to ~50 chars on a word boundary rather than a hard character cut, so
    # titles don't end mid-word.
    content = content.strip()
    if len(content) <= 50:
        return content
    truncated = content[:50]
    last_space = truncated.rfind(' ')
    if last_space > 0:
        truncated = truncated[:last_space]
    return truncated + '…'

# --- Endpoints ---

@router.get("/chat/sessions", response_model=List[ChatSessionResponse])
def get_sessions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return (
        db.query(models.ChatSession)
        .filter(models.ChatSession.user_id == current_user.id)
        .order_by(models.ChatSession.updated_at.desc())
        .all()
    )

@router.get("/chat/sessions/{session_id}", response_model=ChatSessionDetailResponse)
def get_session(session_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = _get_owned_session(db, session_id, current_user.id)
    messages = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.session_id == session_id)
        .order_by(models.ChatMessage.created_at)
        .all()
    )
    return ChatSessionDetailResponse(
        id=session.id,
        mode=session.mode,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=messages
    )

@router.post("/chat/sessions", response_model=ChatSessionResponse)
def create_session(payload: ChatSessionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    session = models.ChatSession(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        mode=payload.mode,
        title=None,
        created_at=now,
        updated_at=now
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.post("/chat/sessions/{session_id}/messages", response_model=ChatMessageResponse)
def create_message(session_id: str, payload: ChatMessageCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = _get_owned_session(db, session_id, current_user.id)

    message = models.ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role=payload.role,
        content=payload.content,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    db.add(message)

    session.updated_at = message.created_at
    if session.title is None and payload.role == 'user':
        session.title = _derive_title(payload.content)

    db.commit()
    db.refresh(message)
    return message

@router.delete("/chat/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = _get_owned_session(db, session_id, current_user.id)

    db.query(models.ChatMessage).filter(models.ChatMessage.session_id == session_id).delete(synchronize_session=False)
    db.delete(session)
    db.commit()
    return {"message": "Chat session deleted"}
