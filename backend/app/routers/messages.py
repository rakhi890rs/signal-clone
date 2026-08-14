from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db
from app.websocket_manager import manager

router = APIRouter(prefix="/api/conversations/{conversation_id}/messages", tags=["messages"])


def _require_participant(conversation_id: str, user_id: str, db: Session) -> models.Conversation:
    conv = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    if not any(p.user_id == user_id for p in conv.participants):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a participant")
    return conv


def _status_out(msg: models.Message) -> schemas.MessageOut:
    return schemas.MessageOut(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        content=msg.content,
        message_type=msg.message_type.value if hasattr(msg.message_type, "value") else msg.message_type,
        reply_to_id=msg.reply_to_id,
        created_at=msg.created_at,
        edited_at=msg.edited_at,
        statuses=[schemas.MessageStatusOut(user_id=s.user_id, status=s.status.value) for s in msg.statuses],
    )


@router.get("", response_model=List[schemas.MessageOut])
def get_messages(
    conversation_id: str,
    before: str | None = Query(None, description="message id cursor for pagination"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _require_participant(conversation_id, current_user.id, db)
    q = db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id, models.Message.deleted.is_(False)
    )
    if before:
        cursor_msg = db.query(models.Message).filter(models.Message.id == before).first()
        if cursor_msg:
            q = q.filter(models.Message.created_at < cursor_msg.created_at)
    msgs = q.order_by(models.Message.created_at.desc()).limit(limit).all()
    msgs.reverse()
    return [_status_out(m) for m in msgs]


@router.post("", response_model=schemas.MessageOut)
async def send_message(
    conversation_id: str,
    payload: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conv = _require_participant(conversation_id, current_user.id, db)

    msg = models.Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=payload.content,
        reply_to_id=payload.reply_to_id,
    )
    db.add(msg)
    db.flush()

    other_ids = [p.user_id for p in conv.participants if p.user_id != current_user.id]
    for uid in other_ids:
        is_online = manager.is_online(uid)
        db.add(
            models.MessageStatus(
                message_id=msg.id,
                user_id=uid,
                status=models.StatusEnum.delivered if is_online else models.StatusEnum.sent,
            )
        )

    conv.last_message_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)

    out = _status_out(msg)
    payload_json = {"type": "new_message", "message": out.model_dump(mode="json")}
    await manager.send_to_users(other_ids, payload_json)
    # echo back to sender's other devices too
    await manager.send_to_user(current_user.id, payload_json)
    return out


@router.post("/read")
async def mark_read(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conv = _require_participant(conversation_id, current_user.id, db)
    my_p = next(p for p in conv.participants if p.user_id == current_user.id)

    latest = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation_id, models.Message.deleted.is_(False))
        .order_by(models.Message.created_at.desc())
        .first()
    )
    if not latest:
        return {"ok": True}

    my_p.last_read_message_id = latest.id

    statuses = (
        db.query(models.MessageStatus)
        .join(models.Message)
        .filter(
            models.Message.conversation_id == conversation_id,
            models.MessageStatus.user_id == current_user.id,
            models.MessageStatus.status != models.StatusEnum.read,
        )
        .all()
    )
    sender_ids_to_notify = set()
    message_ids_read = []
    for s in statuses:
        s.status = models.StatusEnum.read
        s.updated_at = datetime.utcnow()
        message_ids_read.append(s.message_id)
        msg = db.query(models.Message).filter(models.Message.id == s.message_id).first()
        if msg and msg.sender_id:
            sender_ids_to_notify.add(msg.sender_id)
    db.commit()

    for sender_id in sender_ids_to_notify:
        await manager.send_to_user(
            sender_id,
            {
                "type": "messages_read",
                "conversation_id": conversation_id,
                "reader_id": current_user.id,
                "message_ids": message_ids_read,
            },
        )
    return {"ok": True}
