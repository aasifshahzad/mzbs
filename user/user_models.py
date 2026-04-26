from sqlmodel import SQLModel, Field, Enum, Column
from typing import Optional
from datetime import timedelta, datetime
import enum
import re
from pydantic import field_validator

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    USER = "USER"
    ACCOUNTANT = "ACCOUNTANT"
    FEE_MANAGER = "FEE_MANAGER"
    PRINCIPAL = "PRINCIPAL"

class Token(SQLModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: timedelta

class TokenData(SQLModel):
    username: str
    exp: Optional[int] = None

class UserBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)


class UserLogin(SQLModel):
    username: str
    password: str
    grant_type: Optional[str] = "password"  # Default value
    scope: Optional[str] = ""
    client_id: Optional[str] = None
    client_secret: Optional[str] = None

class UserUpdate(SQLModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None

class AdminUserUpdate(SQLModel):
    role: UserRole = Field(description="Must be one of: ADMIN, TEACHER, USER")

class User(UserBase, table=True):
    username: str = Field(unique=True, nullable=False)
    email: str = Field(index=True, unique=True, nullable=False)
    password: str = Field(nullable=False)
    role: UserRole = Field(default=UserRole.USER)

class UserCreate(SQLModel):
    username: str
    email: str
    password: str
    role: UserRole = UserRole.USER

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        """Validate username format: alphanumeric + underscore, 3-20 chars"""
        if not isinstance(v, str):
            raise ValueError('Username must be a string')
        if len(v) < 3 or len(v) > 20:
            raise ValueError('Username must be between 3 and 20 characters')
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username can only contain letters, numbers, and underscores')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Validate password: max 72 UTF-8 bytes (bcrypt constraint)"""
        if not isinstance(v, str):
            raise ValueError('Password must be a string')
        # Bcrypt has a hard limit of 72 bytes UTF-8
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password must not exceed 72 bytes when UTF-8 encoded')
        return v

class UserResponse(SQLModel):
    username: str
    email: str
    role: UserRole
    id: int

class LoginResponse(SQLModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class RefreshToken(SQLModel, table=True):
    """Stores refresh tokens for server-side revocation and tracking"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True, nullable=False)
    token: str = Field(nullable=False, unique=True, index=True)
    expires_at: datetime = Field(nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    revoked_at: Optional[datetime] = None
    
    def is_expired(self) -> bool:
        """Check if token has expired"""
        return datetime.utcnow() > self.expires_at
    
    def is_revoked(self) -> bool:
        """Check if token has been revoked"""
        return self.revoked_at is not None