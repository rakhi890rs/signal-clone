from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db
from app.websocket_manager import manager

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/search", response_model=List[schemas.UserOut])
def search_users(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Search by username, display name, or phone number (for 'add contact')."""
    like = f"%{q}%"
    results = (
        db.query(models.User)
        .filter(
            models.User.id != current_user.id,
            (models.User.username.ilike(like))
            | (models.User.display_name.ilike(like))
            | (models.User.phone_number.ilike(like)),
        )
        .limit(20)
        .all()
    )
    return _with_presence(results)


@router.patch("/me", response_model=schemas.UserOut)
def update_me(
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.display_name is not None:
        current_user.display_name = payload.display_name
    if payload.avatar_color is not None:
        current_user.avatar_color = payload.avatar_color
    db.commit()
    db.refresh(current_user)
    return current_user


def _with_presence(users: List[models.User]) -> List[models.User]:
    for u in users:
        u.is_online = manager.is_online(u.id)
    return users
