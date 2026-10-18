"""Authentication API routes: Registration, Login, and User Profile."""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from app.database import UsersRepository
from app.auth.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    name: str
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4)


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: dict


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    # Check for existing email
    existing = await UsersRepository.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    now = datetime.now(timezone.utc)
    user_doc = {
        "name": req.name,
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "role": "user",
        "created_at": now,
        "last_login_at": now,
    }
    user_id = await UsersRepository.insert_one(user_doc)

    token = create_access_token(data={
        "sub": user_id,
        "email": req.email.lower(),
        "name": req.name,
        "role": "user",
    })

    return {
        "token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": req.name,
            "email": req.email.lower(),
            "role": "user",
        }
    }


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    user = await UsersRepository.find_one({"email": req.email.lower()})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    user_id = str(user["id"])
    last_login_at = datetime.now(timezone.utc)
    await UsersRepository.update_one(
        {"id": user_id},
        {"$set": {"last_login_at": last_login_at}},
    )
    role = user.get("role", "user")
    token = create_access_token(data={
        "sub": user_id,
        "email": user["email"],
        "name": user.get("name", ""),
        "role": role,
    })

    return {
        "token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": user.get("name", ""),
            "email": user["email"],
            "role": role,
        }
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    db_user = await UsersRepository.find_one({"id": current_user["user_id"]})
    if db_user:
        return {
            "id": str(db_user["id"]),
            "name": db_user.get("name", ""),
            "email": db_user.get("email", ""),
            "role": db_user.get("role", "user"),
            "created_at": db_user.get("created_at"),
            "last_login_at": db_user.get("last_login_at"),
        }

    return current_user
