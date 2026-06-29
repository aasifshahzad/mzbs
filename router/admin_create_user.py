from asyncio.log import logger
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError

from db import get_session
from user.user_models import (
    User,
    UserCreate, 
    UserResponse, 
    AdminUserUpdate
)
from user.user_crud import require_admin as check_admin
from user.services import get_password_hash

admin_create_user_router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    responses={404: {"Description": "Not found"}}
)

@admin_create_user_router.get("/", response_model=dict)
async def root():
    return {"message": "Give Provision to ADMIN to add User in different roles"}

@admin_create_user_router.post("/add_user/", response_model=UserResponse)
def create_user(
    user: Annotated[User, Depends(check_admin)], 
    user_create: UserCreate, 
    session: Session = Depends(get_session)
):
    # Hash the password before storing (SECURITY FIX)
    hashed_password = get_password_hash(user_create.password)
    
    # Create user with hashed password
    db_user = User(
        username=user_create.username,
        email=user_create.email,
        password=hashed_password,
        role=user_create.role
    )
    session.add(db_user)

    try:
        session.commit()
        session.refresh(db_user)
        return db_user  # Return the created user
    except IntegrityError as e:
        session.rollback()
        logger.error(f"Integrity error: {e}")
        if "unique constraint" in str(e.orig).lower() or "duplicate key" in str(e.orig).lower():
            raise HTTPException(
                status_code=400, detail="Username or email must be unique."
            )
        raise HTTPException(
            status_code=400, detail="Database integrity error."
        )
    except Exception as e:
        session.rollback()
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=500, detail="Internal server error."
        )

@admin_create_user_router.get("/all_users/", response_model=List[UserResponse])
def read_users(
    current_user: Annotated[User, Depends(check_admin)],
    session: Session = Depends(get_session)
):
    users = session.exec(select(User)).all()
    return users

@admin_create_user_router.get("/{user_id}", response_model=UserResponse)
def read_user(
    current_user: Annotated[User, Depends(check_admin)], 
    user_id: int,
    session: Session = Depends(get_session)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=404, detail="User not found")
    return user

@admin_create_user_router.delete("/{user_id}", response_model=dict)
def delete_user_by_id(
    current_user: Annotated[User, Depends(check_admin)],
    user_id: int, 
    session: Session = Depends(get_session)
):
    """Delete a user by their ID"""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=404, 
            detail=f"User with ID {user_id} not found"
        )
    
    try:
        session.delete(user)
        session.commit()
        return {"message": f"User with ID {user_id} deleted successfully"}
    except Exception as e:
        session.rollback()
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error deleting user"
        )