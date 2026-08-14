"""
In-memory WebSocket connection registry.

One user can have multiple tabs/devices open, so we keep a set of sockets
per user_id. Broadcasting to a conversation looks up which of that
conversation's participants are currently connected and pushes to all of
their sockets.

This is intentionally in-process (not Redis-backed pub/sub) since the
assignment runs as a single server instance; swapping in Redis pub/sub
later would only touch this file.
"""
import json
from typing import Dict, List, Set

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        if user_id in self.active:
            self.active[user_id].discard(websocket)
            if not self.active[user_id]:
                del self.active[user_id]

    def is_online(self, user_id: str) -> bool:
        return user_id in self.active and len(self.active[user_id]) > 0

    async def send_to_user(self, user_id: str, payload: dict) -> None:
        sockets = self.active.get(user_id, set())
        dead = []
        for ws in sockets:
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                dead.append(ws)
        for ws in dead:
            sockets.discard(ws)

    async def send_to_users(self, user_ids: List[str], payload: dict) -> None:
        for uid in user_ids:
            await self.send_to_user(uid, payload)


manager = ConnectionManager()
