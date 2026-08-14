# Signal Clone — Secure Messaging Platform

A full-stack messaging application inspired by Signal. The project supports real-time one-to-one and group conversations with features such as contacts, read receipts, typing indicators, online status, and user authentication.

> **Note:** This project is a clone created for an assignment. Encryption and phone verification are mocked and do not implement Signal's actual end-to-end encryption system.

---

## Features

* User registration and login
* Mock phone number and OTP verification
* JWT-based authentication
* Secure password hashing using bcrypt
* One-to-one conversations
* Group conversations
* Add and remove contacts
* Search for users
* Send and receive messages in real time
* Typing indicators
* Online/offline status
* Read receipts
* Unread message counts
* Conversation history
* Group member management
* Profile updates
* Responsive dark-themed interface

---

## Tech Stack

### Frontend

* Next.js 14
* TypeScript
* Tailwind CSS

### Backend

* Python
* FastAPI
* SQLAlchemy
* Pydantic
* WebSockets

### Database

* SQLite

### Authentication

* JWT
* bcrypt

---

## Project Structure

```text
signal-clone/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── auth.py
│   │   ├── websocket_manager.py
│   │   ├── seed.py
│   │   │
│   │   └── routers/
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── contacts.py
│   │       ├── conversations.py
│   │       ├── messages.py
│   │       └── ws.py
│   │
│   └── requirements.txt
│
└── frontend/
    ├── app/
    │   ├── login/
    │   │   └── page.tsx
    │   ├── register/
    │   │   └── page.tsx
    │   └── chat/
    │       └── page.tsx
    │
    ├── components/
    │   ├── ConversationList
    │   ├── ChatPane
    │   ├── MessageBubble
    │   ├── NewChatModal
    │   ├── NewGroupModal
    │   ├── ConversationInfoPanel
    │   └── Avatar
    │
    └── lib/
        ├── api.ts
        ├── websocket.ts
        ├── auth-context.tsx
        └── types.ts
```

---

# Getting Started

## 1. Clone the repository

```bash
git clone <your-repository-url>
cd signal-clone
```

---

## 2. Backend Setup

Open a terminal and move into the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it.

### Windows

```bash
venv\Scripts\activate
```

### macOS / Linux

```bash
source venv/bin/activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

---

## 3. Seed Demo Data

The project includes some sample users and conversations.

Run:

```bash
python -m app.seed
```

> Running the seed script recreates the SQLite database, so don't run it if you want to keep existing data.

---

## 4. Start the Backend

Run:

```bash
uvicorn app.main:app --reload --port 8000
```

The backend will be available at:

```text
http://localhost:8000
```

FastAPI documentation:

```text
http://localhost:8000/docs
```

---

## 5. Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:3000
```

---

# Demo Accounts

The seed script creates the following demo accounts:

| Username | Password      |
| -------- | ------------- |
| `rakhi`  | `password123` |
| `priya`  | `password123` |
| `arjun`  | `password123` |
| `dev`    | `password123` |
| `sara`   | `password123` |

You can also create a new account through the registration page.

For the mocked OTP flow, use:

```text
123456
```

Any 6-digit OTP is accepted by the current implementation.

---

# How Messaging Works

The application uses both REST APIs and WebSockets.

### REST API

REST APIs are used for operations such as:

* Login and registration
* Managing contacts
* Creating conversations
* Loading messages
* Sending messages
* Updating read status

Messages are saved in SQLite before being sent to connected users.

### WebSockets

WebSockets are used for real-time features such as:

* New message notifications
* Typing indicators
* Online/offline status
* Read receipt updates

This allows messages and status changes to appear without manually refreshing the page.

---

# Authentication

The application uses JWT-based authentication.

During registration:

1. User enters their phone number.
2. A mock OTP is sent.
3. The OTP is verified.
4. User provides their username, display name and password.
5. The password is hashed using bcrypt.
6. A JWT token is generated after successful registration.

The token is stored on the client and sent with authenticated API requests.

---

# Database

The application uses SQLite with SQLAlchemy.

The main tables are:

* `users`
* `contacts`
* `conversations`
* `conversation_participants`
* `messages`
* `message_statuses`

A conversation can represent either a one-to-one chat or a group chat.

For group conversations, message status is stored separately for each participant so that users can have different read states for the same message.

---

# API Overview

| Method | Endpoint                                    | Description           |
| ------ | ------------------------------------------- | --------------------- |
| POST   | `/api/auth/send-otp`                        | Send mock OTP         |
| POST   | `/api/auth/verify-otp`                      | Verify OTP            |
| POST   | `/api/auth/register`                        | Register user         |
| POST   | `/api/auth/login`                           | Login                 |
| GET    | `/api/auth/me`                              | Get current user      |
| GET    | `/api/users/search?q=`                      | Search users          |
| PATCH  | `/api/users/me`                             | Update profile        |
| GET    | `/api/contacts`                             | Get contacts          |
| POST   | `/api/contacts`                             | Add contact           |
| DELETE | `/api/contacts/{id}`                        | Remove contact        |
| GET    | `/api/conversations`                        | Get conversations     |
| POST   | `/api/conversations`                        | Create conversation   |
| POST   | `/api/conversations/{id}/members`           | Add group member      |
| DELETE | `/api/conversations/{id}/members/{user_id}` | Remove group member   |
| GET    | `/api/conversations/{id}/messages`          | Get messages          |
| POST   | `/api/conversations/{id}/messages`          | Send message          |
| POST   | `/api/conversations/{id}/messages/read`     | Mark messages as read |
| WS     | `/ws?token=`                                | Real-time connection  |

Authenticated endpoints require:

```text
Authorization: Bearer <token>
```

---

# Current Limitations

This is an assignment-focused implementation, so some Signal features are simplified.

### Encryption

Real Signal-style end-to-end encryption has **not** been implemented. Encryption is mocked for this project.

### OTP

No real SMS service is connected. The OTP verification is mocked and accepts:

```text
123456
```

### Avatars

Users currently use generated avatars containing initials instead of uploaded profile images.

### WebSocket Scaling

WebSocket connections are stored in memory. The current setup is suitable for a single backend process. A production multi-server setup would require a shared messaging/pub-sub system.

### Features Not Implemented

The following features are outside the current scope:

* File attachments
* Message reactions
* Disappearing messages
* Voice/video calls
* Stories
* Full reply functionality in the UI

---

# Deployment

## Frontend

The Next.js frontend can be deployed using a platform such as Vercel.

Set the environment variable:

```env
NEXT_PUBLIC_API_URL=<your-backend-url>
```

## Backend

The FastAPI backend can be deployed on a service that supports long-running Python applications.

For production, SQLite can be replaced with PostgreSQL and the WebSocket layer can be moved to a shared system if multiple backend instances are used.

---

# Future Improvements

Some improvements that could be added later:

* Real end-to-end encryption
* Real SMS OTP verification
* Image and file sharing
* Message reactions
* Reply and edit messages
* Voice and video calls
* Push notifications
* PostgreSQL for production
* Redis/pub-sub for WebSocket scaling
* Profile image uploads

---

# Disclaimer

This project is an educational implementation inspired by Signal's messaging experience. It is **not an official Signal application** and does not implement Signal's production encryption or security protocols.
