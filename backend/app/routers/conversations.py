from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db
from app.websocket_manager import manager

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


def _to_out(conv: models.Conversation, current_user_id: str, db: Session) -> schemas.ConversationOut:
    participants_out = []
    for p in conv.participants:
        p.user.is_online = manager.is_online(p.user.id)
        participants_out.append(schemas.ParticipantOut(user=p.user, is_admin=p.is_admin))

    last_msg = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conv.id, models.Message.deleted.is_(False))
        .order_by(models.Message.created_at.desc())
        .first()
    )

    my_participant = next((p for p in conv.participants if p.user_id == current_user_id), None)
    unread = 0
    if my_participant:
        q = db.query(func.count(models.Message.id)).filter(
            models.Message.conversation_id == conv.id,
            models.Message.sender_id != current_user_id,
        )
        if my_participant.last_read_message_id:
            marker = db.query(models.Message).filter(
                models.Message.id == my_participant.last_read_message_id
            ).first()
            if marker:
                q = q.filter(models.Message.created_at > marker.created_at)
        unread = q.scalar() or 0

    return schemas.ConversationOut(
        id=conv.id,
        is_group=conv.is_group,
        name=conv.name,
        avatar_color=conv.avatar_color,
        participants=participants_out,
        last_message_at=conv.last_message_at,
        last_message_preview=(last_msg.content[:80] if last_msg else None),
        unread_count=unread,
    )


@router.get("", response_model=List[schemas.ConversationOut])
def list_conversations(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    convs = (
        db.query(models.Conversation)
        .join(models.ConversationParticipant)
        .filter(models.ConversationParticipant.user_id == current_user.id)
        .options(joinedload(models.Conversation.participants).joinedload(models.ConversationParticipant.user))
        .order_by(models.Conversation.last_message_at.desc())
        .all()
    )
    return [_to_out(c, current_user.id, db) for c in convs]


@router.post("", response_model=schemas.ConversationOut)
def create_conversation(
    payload: schemas.ConversationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    all_ids = set(payload.participant_ids) | {current_user.id}

    if not payload.is_group:
        if len(payload.participant_ids) != 1:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "1:1 chat needs exactly one other participant")
        other_id = payload.participant_ids[0]
        # Reuse existing 1:1 conversation if one already exists between these two users
        existing = (
            db.query(models.Conversation)
            .filter(models.Conversation.is_group.is_(False))
            .join(models.ConversationParticipant)
            .filter(models.ConversationParticipant.user_id.in_([current_user.id, other_id]))
            .all()
        )
        for c in existing:
            member_ids = {p.user_id for p in c.participants}
            if member_ids == {current_user.id, other_id}:
                return _to_out(c, current_user.id, db)

    if payload.is_group and not payload.name:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Group conversations require a name")

    conv = models.Conversation(
        is_group=payload.is_group, name=payload.name, created_by=current_user.id
    )
    db.add(conv)
    db.flush()

    for uid in all_ids:
        db.add(
            models.ConversationParticipant(
                conversation_id=conv.id,
                user_id=uid,
                is_admin=(payload.is_group and uid == current_user.id),
            )
        )
    db.commit()
    db.refresh(conv)
    return _to_out(conv, current_user.id, db)


@router.post("/{conversation_id}/members", response_model=schemas.ConversationOut)
async def add_member(
    conversation_id: str,
    payload: schemas.GroupMemberAction,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conv, my_p = _require_admin(conversation_id, current_user.id, db)
    target = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    exists = any(p.user_id == target.id for p in conv.participants)
    if exists:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Already a member")

    db.add(models.ConversationParticipant(conversation_id=conv.id, user_id=target.id))
    system_msg = models.Message(
        conversation_id=conv.id,
        sender_id=None,
        content=f"{current_user.display_name} added {target.display_name}",
        message_type=models.MessageType.system,
    )
    db.add(system_msg)
    conv.last_message_at = datetime.utcnow()
    db.commit()
    db.refresh(conv)

    out = _to_out(conv, current_user.id, db)
    member_ids = [p.user_id for p in conv.participants]
    await manager.send_to_users(member_ids, {"type": "conversation_updated", "conversation": out.model_dump(mode="json")})
    return out


@router.delete("/{conversation_id}/members/{user_id}", response_model=schemas.ConversationOut)
async def remove_member(
    conversation_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conv, my_p = _require_admin(conversation_id, current_user.id, db)
    target_p = next((p for p in conv.participants if p.user_id == user_id), None)
    if not target_p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not a member")

    removed_user = target_p.user
    db.delete(target_p)
    system_msg = models.Message(
        conversation_id=conv.id,
        sender_id=None,
        content=f"{current_user.display_name} removed {removed_user.display_name}",
        message_type=models.MessageType.system,
    )
    db.add(system_msg)
    conv.last_message_at = datetime.utcnow()
    db.commit()
    db.refresh(conv)

    out = _to_out(conv, current_user.id, db)
    member_ids = [p.user_id for p in conv.participants] + [user_id]
    await manager.send_to_users(member_ids, {"type": "conversation_updated", "conversation": out.model_dump(mode="json")})
    return out


def _require_admin(conversation_id: str, user_id: str, db: Session):
    conv = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not conv or not conv.is_group:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Group not found")
    my_p = next((p for p in conv.participants if p.user_id == user_id), None)
    if not my_p:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this group")
    if not my_p.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only admins can manage members")
    return conv, my_p
