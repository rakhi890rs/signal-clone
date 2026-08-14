"""
Seed the database with sample users, contacts, conversations, and messages
so the app is immediately usable after `python -m app.seed`.

All seeded users share the password: password123
"""
import random
from datetime import datetime, timedelta

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import (
    Contact,
    Conversation,
    ConversationParticipant,
    Message,
    MessageStatus,
    StatusEnum,
    User,
)

COLORS = ["#2C6BED", "#3A76F0", "#7C5CFC", "#0FAE96", "#E6A100", "#E15554", "#4C6EF5"]

USERS = [
    ("priya", "+91 90000 00001", "Priya Sharma"),
    ("arjun", "+91 90000 00002", "Arjun Mehta"),
    ("rakhi", "+91 90000 00003", "Rakhi Singh"),
    ("dev", "+91 90000 00004", "Dev Patel"),
    ("sara", "+91 90000 00005", "Sara Khan"),
]


def run():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    users = {}
    for username, phone, display_name in USERS:
        u = User(
            username=username,
            phone_number=phone,
            display_name=display_name,
            avatar_color=random.choice(COLORS),
            password_hash=hash_password("password123"),
            last_seen=datetime.utcnow() - timedelta(minutes=random.randint(1, 500)),
        )
        db.add(u)
        users[username] = u
    db.commit()

    # Everyone is contacts with everyone (small seed network)
    for a in users.values():
        for b in users.values():
            if a.id != b.id:
                db.add(Contact(owner_id=a.id, contact_user_id=b.id))
    db.commit()

    def make_1to1(u1, u2, messages):
        conv = Conversation(is_group=False)
        db.add(conv)
        db.flush()
        db.add(ConversationParticipant(conversation_id=conv.id, user_id=u1.id))
        db.add(ConversationParticipant(conversation_id=conv.id, user_id=u2.id))
        base_time = datetime.utcnow() - timedelta(hours=len(messages))
        last_msg = None
        for i, (sender, text) in enumerate(messages):
            m = Message(
                conversation_id=conv.id,
                sender_id=sender.id,
                content=text,
                created_at=base_time + timedelta(minutes=i * 3),
            )
            db.add(m)
            db.flush()
            other = u2 if sender.id == u1.id else u1
            status = StatusEnum.read if i < len(messages) - 1 else StatusEnum.delivered
            db.add(MessageStatus(message_id=m.id, user_id=other.id, status=status))
            last_msg = m
        conv.last_message_at = last_msg.created_at if last_msg else conv.created_at
        return conv

    make_1to1(
        users["rakhi"], users["priya"],
        [
            (users["priya"], "Hey! Are we still on for the review tomorrow?"),
            (users["rakhi"], "Yes, 10am works for me"),
            (users["priya"], "Perfect, I'll send the doc tonight"),
            (users["rakhi"], "Sounds good, talk soon!"),
        ],
    )
    make_1to1(
        users["rakhi"], users["arjun"],
        [
            (users["arjun"], "Did you push the latest changes?"),
            (users["rakhi"], "Pushing now, give me 5 mins"),
            (users["arjun"], "No rush, thanks!"),
        ],
    )
    make_1to1(
        users["rakhi"], users["dev"],
        [(users["dev"], "Welcome to the team! 🎉")],
    )

    # Group conversation
    group = Conversation(is_group=True, name="Weekend Trip 🏔️", created_by=users["rakhi"].id)
    db.add(group)
    db.flush()
    members = [users["rakhi"], users["priya"], users["arjun"], users["sara"]]
    for i, m in enumerate(members):
        db.add(ConversationParticipant(conversation_id=group.id, user_id=m.id, is_admin=(i == 0)))

    group_messages = [
        (users["priya"], "So excited for this weekend!"),
        (users["arjun"], "Same! What time are we leaving Saturday?"),
        (users["rakhi"], "Let's say 7am to beat traffic"),
        (users["sara"], "Works for me, I'll bring snacks"),
        (users["arjun"], "I'll handle the playlist 🎶"),
    ]
    base_time = datetime.utcnow() - timedelta(hours=2)
    last_msg = None
    for i, (sender, text) in enumerate(group_messages):
        m = Message(
            conversation_id=group.id,
            sender_id=sender.id,
            content=text,
            created_at=base_time + timedelta(minutes=i * 5),
        )
        db.add(m)
        db.flush()
        for other in members:
            if other.id != sender.id:
                db.add(MessageStatus(message_id=m.id, user_id=other.id, status=StatusEnum.read))
        last_msg = m
    group.last_message_at = last_msg.created_at

    db.commit()
    db.close()
    print("Seeded database with sample users, contacts, and conversations.")
    print("Login with any of these usernames / password123:")
    for username, _, display_name in USERS:
        print(f"  {username}  ({display_name})")


if __name__ == "__main__":
    run()
