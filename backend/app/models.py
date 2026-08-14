"""
Database schema.

Design notes
------------
- `Conversation` covers BOTH 1:1 chats and groups (is_group flag). A 1:1 chat
  is just a conversation with exactly two `ConversationParticipant` rows and
  no name/avatar. This avoids duplicating message/read-receipt logic across
  two separate tables.
- `ConversationParticipant` is the join table between users and
  conversations; it also carries per-user state that doesn't belong on the
  conversation itself (admin flag, last_read_message_id for unread counts,
  muted).
- `MessageStatus` is a per-recipient row (message x user) so read/delivered
  receipts work correctly in groups, where each member reads at a different
  time. For 1:1 chats there's simply one row on the other side.
- `Contact` is directional (owner_id -> contact_user_id) mirroring how phone
  contact lists work in Signal: you can have someone in your contacts
  without them having you in theirs.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    username = Column(String, unique=True, nullable=False, index=True)
    phone_number = Column(String, unique=True, nullable=True, index=True)
    display_name = Column(String, nullable=False)
    avatar_color = Column(String, default="#2C6BED")  # mocked avatar (initials + color)
    password_hash = Column(String, nullable=False)
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    sent_messages = relationship("Message", back_populates="sender")


class Contact(Base):
    __tablename__ = "contacts"
    __table_args__ = (UniqueConstraint("owner_id", "contact_user_id", name="uq_contact_pair"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    contact_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    nickname = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", foreign_keys=[owner_id])
    contact_user = relationship("User", foreign_keys=[contact_user_id])


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=gen_uuid)
    is_group = Column(Boolean, default=False)
    name = Column(String, nullable=True)          # only used for groups
    avatar_color = Column(String, default="#3A76F0")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_message_at = Column(DateTime, default=datetime.utcnow, index=True)

    participants = relationship(
        "ConversationParticipant", back_populates="conversation", cascade="all, delete-orphan"
    )
    messages = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"
    __table_args__ = (UniqueConstraint("conversation_id", "user_id", name="uq_participant"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    is_admin = Column(Boolean, default=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    last_read_message_id = Column(String, nullable=True)  # drives unread-count math
    muted = Column(Boolean, default=False)

    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User")


class MessageType(str, enum.Enum):
    text = "text"
    system = "system"  # e.g. "X added Y to the group"


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False, index=True)
    sender_id = Column(String, ForeignKey("users.id"), nullable=True)  # null for system messages
    content = Column(Text, nullable=False)
    message_type = Column(Enum(MessageType), default=MessageType.text)
    reply_to_id = Column(String, ForeignKey("messages.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    edited_at = Column(DateTime, nullable=True)
    deleted = Column(Boolean, default=False)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")
    reply_to = relationship("Message", remote_side=[id])
    statuses = relationship("MessageStatus", back_populates="message", cascade="all, delete-orphan")


class StatusEnum(str, enum.Enum):
    sent = "sent"
    delivered = "delivered"
    read = "read"


class MessageStatus(Base):
    """One row per (message, recipient) so group read receipts are per-member."""

    __tablename__ = "message_statuses"
    __table_args__ = (UniqueConstraint("message_id", "user_id", name="uq_message_status"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    message_id = Column(String, ForeignKey("messages.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(StatusEnum), default=StatusEnum.sent)
    updated_at = Column(DateTime, default=datetime.utcnow)

    message = relationship("Message", back_populates="statuses")
    user = relationship("User")
