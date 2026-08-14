from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import (
    MOCK_OTP,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/send-otp")
def send_otp(phone_number: str):
    """Mocked: pretends to send an SMS. Always accepts '123456' on verify."""
    return {"message": f"OTP sent to {phone_number} (mocked). Use {MOCK_OTP}."}


@router.post("/verify-otp")
def verify_otp(payload: schemas.OTPVerifyRequest):
    if payload.otp != MOCK_OTP:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid OTP")
    return {"verified": True}


@router.post("/register", response_model=schemas.TokenResponse)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Username already taken")
    if payload.phone_number and db.query(models.User).filter(
        models.User.phone_number == payload.phone_number
    ).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Phone number already registered")

    user = models.User(
        username=payload.username,
        phone_number=payload.phone_number,
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password")

    token = create_access_token(user.id)
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user
