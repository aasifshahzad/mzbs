# from fastapi import APIRouter, Depends, HTTPException, Cookie, Response, status
# from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
# from sqlmodel import Session, select
# from datetime import timedelta

# from .user_models import (
#     User, UserCreate, UserUpdate, UserResponse, 
#     LoginResponse, AdminUserUpdate, UserLogin
# )
# from .user_crud import (
#     user_login, delete_user, signup_user,
#     get_current_user, check_admin, update_user
# )
# from .services import (
#     verify_token, create_access_token,
#     revoke_refresh_token, ACCESS_TOKEN_EXPIRE_MINUTES
# )
# from db import get_session
# from typing import Annotated, List

# # Create separate routers for auth and public endpoints
# public_router = APIRouter(
#     tags=["Public"]
# )

# user_router = APIRouter(
#     prefix="/auth",
#     tags=["User"]
# )

# admin_router = APIRouter(
#     prefix="/admin/users",
#     tags=["Admin"]
# )

# # Update tokenUrl to remove auth prefix
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login-swagger")

# # Public routes (no auth prefix)
# @public_router.post("/login-swagger", response_model=LoginResponse)
# async def login_for_swagger(
#     form_data: OAuth2PasswordRequestForm = Depends(),
#     db: Session = Depends(get_session)
# ):
#     return user_login(db, form_data)

# @public_router.post("/login", response_model=LoginResponse)
# async def login_for_frontend(
#     response: Response,
#     login_data: UserLogin,
#     db: Session = Depends(get_session)
# ):
#     """Login endpoint for frontend clients"""
#     try:
#         login_response = user_login(db, login_data)
        
#         # Set HTTP-only cookies for tokens
#         response.set_cookie(
#             key="refresh_token",
#             value=login_response.refresh_token,
#             httponly=True,
#             secure=True,  # Enable in production
#             samesite="lax",
#             max_age=60 * 60 * 24 * 7  # 7 days
#         )

#         return login_response

#     except HTTPException as e:
#         raise e
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Login failed: {str(e)}"
#         )

# @public_router.post("/signup", response_model=UserResponse)
# async def signup(
#     user_data: UserCreate,
#     db: Session = Depends(get_session)
# ):
#     """Create new user account"""
#     try:
#         # Check existing user
#         existing_user = db.exec(
#             select(User).where(
#                 (User.username == user_data.username) | 
#                 (User.email == user_data.email)
#             )
#         ).first()
        
#         if existing_user:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Username or email already registered"
#             )

#         # Create user
#         new_user = await signup_user(user_data, db)
#         return UserResponse(
#             id=new_user.id,
#             username=new_user.username,
#             email=new_user.email,
#             role=new_user.role
#         )

#     except HTTPException as e:
#         raise e
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Signup failed: {str(e)}"
#         )

# # Protected routes (keep auth prefix)
# @user_router.get("/me", response_model=UserResponse)
# async def get_current_user_info(
#     current_user: Annotated[User, Depends(get_current_user)]
# ):
#     return current_user

# @user_router.post("/logout")
# async def logout(
#     response: Response,
#     refresh_token: str = Cookie(None),
#     db: Session = Depends(get_session)
# ):
#     """Logout user and clear tokens"""
#     try:
#         if refresh_token:
#             await revoke_refresh_token(db, refresh_token)
        
#         # Clear cookies
#         response.delete_cookie(key="refresh_token")
#         return {"message": "Successfully logged out"}
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Logout failed: {str(e)}"
#         )
        

# @public_router.post("/signup/bulk", response_model=List[UserResponse])
# async def bulk_signup(
#     users_data: List[UserCreate],
#     db: Session = Depends(get_session)
# ):
#     """Create multiple user accounts at once"""
#     created_users = []
#     try:
#         for user_data in users_data:
#             # Check if user already exists
#             existing_user = db.exec(
#                 select(User).where(
#                     (User.username == user_data.username) |
#                     (User.email == user_data.email)
#                 )
#             ).first()

#             if existing_user:
#                 # Skip existing user (or raise error if you want strict behavior)
#                 continue

#             # Create user
#             new_user = await signup_user(user_data, db)
#             created_users.append(
#                 UserResponse(
#                     id=new_user.id,
#                     username=new_user.username,
#                     email=new_user.email,
#                     role=new_user.role
#                 )
#             )

#         if not created_users:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="No new users created (all already exist)."
#             )

#         return created_users

#     except HTTPException as e:
#         raise e
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Bulk signup failed: {str(e)}"
#         )


# @user_router.post("/refresh", response_model=LoginResponse)
# async def refresh_token(
#     refresh_token: str = Cookie(None),
#     response: Response = None,
#     db: Session = Depends(get_session)
# ):
#     """Refresh access token using refresh token"""
#     if not refresh_token:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="No refresh token provided"
#         )

#     try:
#         # Verify the refresh token
#         payload = verify_token(refresh_token)
#         if not payload:
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="Invalid refresh token"
#             )

#         # Get username from token
#         username = payload.get("sub")
#         if not username:
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="Invalid token payload"
#             )

#         # Get user from database
#         user = get_user_by_username(db, username)
#         if not user:
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="User not found"
#             )

#         # Create new access token
#         access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#         access_token = create_access_token(
#             data={"sub": user.username},
#             expires_delta=access_token_expires
#         )

#         return {
#             "access_token": access_token,
#             "token_type": "bearer",
#             "user": UserResponse(
#                 id=user.id,
#                 username=user.username,
#                 email=user.email,
#                 role=user.role
#             )
#         }

#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail=f"Could not refresh token: {str(e)}"
#         )

# # Admin routes
# @admin_router.get("/", response_model=list[User])
# def read_users(
#     db: Annotated[Session, Depends(get_session)],
#     current_user: Annotated[User, Depends(check_admin)]
# ) -> list[User]:
#     return db.exec(select(User)).all()

# # ... Add all other admin routes from main.py ...

from fastapi import APIRouter, Depends, HTTPException, Cookie, Response, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select
from datetime import timedelta
from slowapi import Limiter
from slowapi.util import get_remote_address

from .user_models import (
    User, UserCreate, UserUpdate, UserResponse, 
    LoginResponse, AdminUserUpdate, UserLogin, UserRole
)
from .user_crud import (
    user_login, delete_user, signup_user,
    get_current_user, update_user,
    # Replace old check functions with new role checkers
    require_admin, require_admin_principal, require_admin_teacher_principal,
    require_admin_accountant, require_admin_fee_manager, require_all_roles,
    require_authenticated
)
from .services import (
    verify_token, create_access_token, get_user_by_username,
    revoke_refresh_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash
)
from db import get_session
from typing import Annotated, List

# Create separate routers for auth and public endpoints
public_router = APIRouter(
    tags=["Public"]
)

user_router = APIRouter(
    prefix="/auth",
    tags=["User"]
)

admin_router = APIRouter(
    prefix="/admin/users",
    tags=["Admin"]
)

# Security: Initialize rate limiter (prevents brute force attacks)
limiter = Limiter(key_func=get_remote_address)

# Update tokenUrl to remove auth prefix
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login-swagger")

# Public routes (no auth prefix) - No role checking needed
@public_router.post("/login-swagger", response_model=LoginResponse)
@limiter.limit("5/minute")  # Security: Rate limiting - 5 attempts per minute per IP
async def login_for_swagger(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_session)
):
    return user_login(db, form_data)

@public_router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")  # Security: Rate limiting - 5 attempts per minute per IP
async def login_for_frontend(
    request: Request,
    response: Response,
    login_data: UserLogin,
    db: Session = Depends(get_session)
):
    """Login endpoint for frontend clients"""
    try:
        login_response = user_login(db, login_data)
        
        # Set HTTP-only cookies for tokens (security: CRITICAL)
        # Access token in secure HTTPOnly cookie
        response.set_cookie(
            key="access_token",
            value=login_response.access_token,
            httponly=True,
            secure=True,  # HTTPS only
            samesite="strict",  # CSRF protection
            max_age=15 * 60  # 15 minutes
        )
        
        # Refresh token in separate secure HTTPOnly cookie
        response.set_cookie(
            key="refresh_token",
            value=login_response.refresh_token,
            httponly=True,
            secure=True,  # HTTPS only
            samesite="strict",  # CSRF protection
            max_age=60 * 60 * 24 * 7  # 7 days
        )

        # Return tokens in response so frontend can store in localStorage
        # (tokens are ALSO in secure HTTPOnly cookies for double protection)
        return LoginResponse(
            access_token=login_response.access_token,
            refresh_token=login_response.refresh_token,
            expires_in=login_response.expires_in,
            token_type="bearer",
            user=login_response.user
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@public_router.post("/signup", response_model=UserResponse)
@limiter.limit("3/hour")  # Security: Rate limiting - 3 signups per hour per IP
async def signup(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_session)
):
    """Create new user account"""
    try:
        # Check existing user
        existing_user = db.exec(
            select(User).where(
                (User.username == user_data.username) | 
                (User.email == user_data.email)
            )
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account with this username or email already exists"
            )

        # Create user
        new_user = await signup_user(user_data, db)
        return UserResponse(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            role=new_user.role
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {str(e)}"
        )

# Protected routes (keep auth prefix)
@user_router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Annotated[User, Depends(get_current_user)]
):
    return current_user

@user_router.post("/logout")
async def logout(
    current_user: Annotated[User, Depends(get_current_user)],
    response: Response,
    refresh_token: str = Cookie(None),
    access_token: str = Cookie(None),
    db: Session = Depends(get_session)
):
    """Logout user and revoke tokens"""
    try:
        # Revoke refresh token (server-side revocation)
        if refresh_token:
            revoke_refresh_token(db, refresh_token)
        
        # Clear both cookies to ensure clean logout
        response.delete_cookie(
            key="access_token",
            httponly=True,
            secure=True,
            samesite="strict"
        )
        response.delete_cookie(
            key="refresh_token",
            httponly=True,
            secure=True,
            samesite="strict"
        )
        
        logger.info(f"User {current_user.username} logged out successfully")
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Logout error for user {current_user.username}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )
        

@public_router.post("/signup/bulk", response_model=List[UserResponse])
async def bulk_signup(
    current_user: Annotated[User, Depends(require_admin())],  # Only ADMIN can bulk signup
    users_data: List[UserCreate],
    db: Session = Depends(get_session)
):
    """Create multiple user accounts at once"""
    created_users = []
    try:
        for user_data in users_data:
            # Check if user already exists
            existing_user = db.exec(
                select(User).where(
                    (User.username == user_data.username) |
                    (User.email == user_data.email)
                )
            ).first()

            if existing_user:
                # Skip existing user (or raise error if you want strict behavior)
                continue

            # Create user
            new_user = await signup_user(user_data, db)
            created_users.append(
                UserResponse(
                    id=new_user.id,
                    username=new_user.username,
                    email=new_user.email,
                    role=new_user.role
                )
            )

        if not created_users:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No new users created (all already exist)."
            )

        return created_users

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk signup failed: {str(e)}"
        )


@user_router.post("/refresh", response_model=LoginResponse)
@limiter.limit("30/minute")  # Security: Rate limiting - 30 attempts per minute per IP (token refresh queue handles deduplication)
async def refresh_token(
    request: Request,
    response: Response,
    refresh_token: str = Cookie(None),
    db: Session = Depends(get_session)
):
    """Refresh access token using refresh token cookie"""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided"
        )

    try:
        # Verify the refresh token
        payload = verify_token(refresh_token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        # Get username from token
        username = payload.get("sub")
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

        # Get user from database
        user = get_user_by_username(db, username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        # Create new access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username},
            expires_delta=access_token_expires
        )

        # Set new access token in HTTPOnly cookie (security: CRITICAL)
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True,  # HTTPS only
            samesite="strict",  # CSRF protection
            max_age=15 * 60  # 15 minutes
        )

        # Return empty token (client doesn't need it - it's in secure cookie)
        return LoginResponse(
            access_token="",  # Empty - token is in HTTPOnly cookie
            refresh_token="",  # Empty - already in cookie
            expires_in=15 * 60,
            token_type="bearer",
            user=UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                role=user.role
            )
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not refresh token: {str(e)}"
        )

# Admin routes - Only ADMIN can access these
@admin_router.get("/", response_model=list[UserResponse])
def read_users(
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin())]  # Updated to new role checker
) -> list[UserResponse]:
    """Get all users (Admin only)"""
    try:
        users = db.exec(select(User)).all()
        return [
            UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                role=user.role.value  # Convert enum to string
            )
            for user in users
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching users: {str(e)}"
        )

# Create new user (Admin only)
@admin_router.post("/", response_model=UserResponse)
def create_user(
    user_data: UserCreate,
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin())]  # Only ADMIN
):
    """Create a new user (Admin only)"""
    try:
        # Check if user already exists
        existing_user = db.exec(
            select(User).where(
                (User.username == user_data.username) |
                (User.email == user_data.email)
            )
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already exists"
            )

        # Create new user
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,  # Password will be hashed in the model
            role=UserRole(user_data.role.upper()) if isinstance(user_data.role, str) else user_data.role
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return UserResponse(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            role=new_user.role.value
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

# Update user (Admin only)
@admin_router.put("/{user_id}", response_model=UserResponse)
def update_user_admin(
    user_id: int,
    user_data: UserUpdate,
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin())]  # Only ADMIN
):
    """Update user information (Admin only)"""
    try:
        user = db.exec(select(User).where(User.id == user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )

        # Prevent admin from changing their own role through this endpoint
        if user.username == current_user.username and user_data.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot change your own role"
            )

        # Update fields if provided
        if user_data.username:
            # Check if new username is already taken
            existing_user = db.exec(
                select(User).where(
                    (User.username == user_data.username) & (User.id != user_id)
                )
            ).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
            user.username = user_data.username

        if user_data.email:
            # Check if new email is already taken
            existing_user = db.exec(
                select(User).where(
                    (User.email == user_data.email) & (User.id != user_id)
                )
            ).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already taken"
                )
            user.email = user_data.email

        if user_data.password:
            user.password = get_password_hash(user_data.password)  # Hash the password

        if user_data.role:
            user.role = UserRole(user_data.role.upper()) if isinstance(user_data.role, str) else user_data.role

        db.commit()
        db.refresh(user)

        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role.value
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user: {str(e)}"
        )

# Delete user (Admin only)
@admin_router.delete("/{user_id}")
def delete_user_admin(
    user_id: int,
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin())]  # Only ADMIN
):
    """Delete user (Admin only)"""
    try:
        user = db.exec(select(User).where(User.id == user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )

        # Prevent admin from deleting themselves
        if user.username == current_user.username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete your own account"
            )

        db.delete(user)
        db.commit()

        return {"message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}"
        )

@admin_router.patch("/{username}/role", response_model=UserResponse)
async def update_user_role(
    username: str,
    current_user: Annotated[User, Depends(require_admin())],  # Only ADMIN can change roles
    user_update: AdminUserUpdate,
    db: Session = Depends(get_session)
):
    """Update user role as admin"""
    # Find the user to update
    user_to_update = db.exec(select(User).where(User.username == username)).first()
    if not user_to_update:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"User {username} not found"
        )
    
    # Prevent admin from changing their own role
    if user_to_update.username == current_user.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin cannot change their own role"
        )
    
    try:
        # Convert role to enum (ensure it's uppercase)
        if isinstance(user_update.role, str):
            new_role = UserRole(user_update.role.upper())
        else:
            new_role = user_update.role

        # Update the user's role
        user_to_update.role = new_role
        db.commit()
        db.refresh(user_to_update)
        return user_to_update
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user role: {str(e)}"
        )