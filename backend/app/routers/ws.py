import json
from datetime import datetime

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app import models
from app.auth import decode_token
from app.database import SessionLocal
from app.websocket_manager import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    user_id = decode_token(token)
    if not user_id:
        await websocket.close(code=4001)
        return

    db: Session = SessionLocal()
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        await websocket.close(code=4001)
        db.close()
        return

    await manager.connect(user_id, websocket)
    user.is_online = True
    user.last_seen = datetime.utcnow()
    db.commit()

    await _broadcast_presence(user_id, True, db)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            event_type = data.get("type")

            if event_type == "typing":
                conversation_id = data.get("conversation_id")
                is_typing = data.get("is_typing", False)
                conv = db.query(models.Conversation).filter(
                    models.Conversation.id == conversation_id
                ).first()
                if conv:
                    other_ids = [p.user_id for p in conv.participants if p.user_id != user_id]
                    await manager.send_to_users(
                        other_ids,
                        {
                            "type": "typing",
                            "conversation_id": conversation_id,
                            "user_id": user_id,
                            "is_typing": is_typing,
                        },
                    )
            elif event_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id, websocket)
        if not manager.is_online(user_id):
            user.is_online = False
            user.last_seen = datetime.utcnow()
            db.commit()
            await _broadcast_presence(user_id, False, db)
        db.close()


async def _broadcast_presence(user_id: str, is_online: bool, db: Session):
    """Notify everyone who shares a conversation with this user."""
    conv_ids = [
        cp.conversation_id
        for cp in db.query(models.ConversationParticipant).filter(
            models.ConversationParticipant.user_id == user_id
        )
    ]
    if not conv_ids:
        return
    peer_ids = {
        cp.user_id
        for cp in db.query(models.ConversationParticipant).filter(
            models.ConversationParticipant.conversation_id.in_(conv_ids),
            models.ConversationParticipant.user_id != user_id,
        )
    }
    await manager.send_to_users(
        list(peer_ids), {"type": "presence", "user_id": user_id, "is_online": is_online}
    )
