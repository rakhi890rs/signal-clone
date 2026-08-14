from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db
from app.websocket_manager import manager

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.get("", response_model=List[schemas.ContactOut])
def list_contacts(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    contacts = (
        db.query(models.Contact).filter(models.Contact.owner_id == current_user.id).all()
    )
    out = []
    for c in contacts:
        c.contact_user.is_online = manager.is_online(c.contact_user.id)
        out.append(schemas.ContactOut(id=c.id, nickname=c.nickname, user=c.contact_user))
    return out


@router.post("", response_model=schemas.ContactOut)
def add_contact(
    payload: schemas.ContactCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    target = db.query(models.User).filter(models.User.username == payload.username).first()
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No user with that username")
    if target.id == current_user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot add yourself")

    existing = (
        db.query(models.Contact)
        .filter(models.Contact.owner_id == current_user.id, models.Contact.contact_user_id == target.id)
        .first()
    )
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Already in contacts")

    contact = models.Contact(
        owner_id=current_user.id, contact_user_id=target.id, nickname=payload.nickname
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return schemas.ContactOut(id=contact.id, nickname=contact.nickname, user=target)


@router.delete("/{contact_id}", status_code=204)
def delete_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    contact = (
        db.query(models.Contact)
        .filter(models.Contact.id == contact_id, models.Contact.owner_id == current_user.id)
        .first()
    )
    if not contact:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contact not found")
    db.delete(contact)
    db.commit()
