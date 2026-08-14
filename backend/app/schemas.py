from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    username: str
    phone_number: Optional[str] = None
    display_name: str
    password: str


class OTPVerifyRequest(BaseModel):
    phone_number: str
    otp: str  # mocked: always "123456"


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# ---------- User ----------
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    phone_number: Optional[str] = None
    display_name: str
    avatar_color: str
    is_online: bool
    last_seen: datetime


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_color: Optional[str] = None


# ---------- Contacts ----------
class ContactCreate(BaseModel):
    username: str
    nickname: Optional[str] = None


class ContactOut(BaseModel):
    id: str
    nickname: Optional[str] = None
    user: UserOut


# ---------- Conversations ----------
class ConversationCreate(BaseModel):
    is_group: bool = False
    name: Optional[str] = None
    participant_ids: List[str]  # for 1:1, exactly one other user id


class ParticipantOut(BaseModel):
    user: UserOut
    is_admin: bool


class ConversationOut(BaseModel):
    id: str
    is_group: bool
    name: Optional[str] = None
    avatar_color: str
    participants: List[ParticipantOut]
    last_message_at: datetime
    last_message_preview: Optional[str] = None
    unread_count: int = 0


class GroupMemberAction(BaseModel):
    user_id: str


# ---------- Messages ----------
class MessageCreate(BaseModel):
    content: str
    reply_to_id: Optional[str] = None


class MessageStatusOut(BaseModel):
    user_id: str
    status: str


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: Optional[str] = None
    content: str
    message_type: str
    reply_to_id: Optional[str] = None
    created_at: datetime
    edited_at: Optional[datetime] = None
    statuses: List[MessageStatusOut] = []


class TypingEvent(BaseModel):
    conversation_id: str
    is_typing: bool
