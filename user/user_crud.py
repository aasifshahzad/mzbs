from datetime import timedelta
from jose import JWTError, jwt
from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlmodel import Session, select
from db import get_session
from user.settings import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, REFRESH_TOKEN_EXPIRE_MINUTES, SECRET_KEY
from user.services import create_access_token, get_password_hash, get_user_by_username, verify_password, pwd_context, oauth2_scheme
from user.user_models import (
    LoginResponse, 
    TokenData, 
    User, 
    UserCreate,
    UserLogin, 
    UserResponse, 
    UserUpdate,
    UserRole,
    AdminUserUpdate
)
from passlib.context import CryptContext

# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# def user_login(db: Session, form_data: UserLogin | OAuth2PasswordRequestForm) -> LoginResponse:
#     username = form_data.username
#     password = form_data.password
    
#     user = get_user_by_username(db, username)
#     if not user or not verify_password(password, user.password):
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect username or password",
#             headers={"WWW-Authenticate": "Bearer"},
#         )

#     access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     access_token = create_access_token(
#         data={"sub": user.username}, expires_delta=access_token_expires
#     )

#     refresh_token_expires = timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
#     refresh_token = create_access_token(
#         data={"sub": user.username}, expires_delta=refresh_token_expires
#     )

#     user_response = UserResponse(
#         username=user.username,
#         email=user.email,
#         role=user.role,
#         id=user.id
#     )

#     return LoginResponse(
#         access_token=access_token,
#         refresh_token=refresh_token,
#         expires_in=int(access_token_expires.total_seconds()),
#         token_type="bearer",
#         user=user_response
#     )


# async def signup_user(user_data: UserCreate, db: Session) -> User:
#     """
#     Create a new user in the database
#     """
#     # Hash the password
#     hashed_password = pwd_context.hash(user_data.password)
    
#     # Create new user instance without specifying the ID (let DB auto-increment)
#     db_user = User(
#         username=user_data.username,
#         email=user_data.email,
#         password=hashed_password,
#         role=user_data.role
#     )
    
#     try:
#         db.add(db_user)
#         db.commit()
#         db.refresh(db_user)
#         return db_user
#     except Exception as e:
#         db.rollback()
#         raise e

# def update_user(user: UserUpdate, session: Session, current_user: User) -> User:
#     updated_user = session.exec(select(User).where(User.id == current_user.id)).first()
#     if not updated_user:
#         raise HTTPException(status_code=404, detail="User not found")
#     update_data = user.model_dump(exclude_unset=True)
#     for key, value in update_data.items():
#         value = value if key != "password" else pwd_context.hash(value)
#         setattr(updated_user, key, value)
#     session.commit()
#     session.refresh(updated_user)
#     return updated_user

# def delete_user(session: Session, username: str) -> dict[str, str]:
#     user = session.exec(select(User).where(User.username == username)).first()
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")
#     session.delete(user)
#     session.commit()
#     return {"message": f"User {username} deleted successfully"}

# async def get_current_user(
#     token: Annotated[str, Depends(oauth2_scheme)], 
#     db: Annotated[Session, Depends(get_session)]
# ) -> User:
#     credentials_exception = HTTPException(
#         status_code=status.HTTP_401_UNAUTHORIZED,
#         # detail="Could not validate credentials",
#         # headers={"WWW-Authenticate": "Bearer"},
#     )
#     try:
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         username: str = payload.get("sub")
#         if username is None:
#             raise credentials_exception
#         token_data = TokenData(username=username)
#     except JWTError:
#         raise credentials_exception
        
#     user = get_user_by_username(db, username=token_data.username)
#     if user is None:
#         raise credentials_exception
#     return user


# async def check_admin_or_teacher(
#     current_user: Annotated[User, Depends(get_current_user)]
# ) -> User:
#     """Check if user is either admin or teacher"""
#     if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
#         raise HTTPException(
#             status_code=403,
#             detail="Only administrators and teachers can access this resource"
#         )
#     return current_user

# # async def check_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
# #     if user.role != UserRole.ADMIN:  # Compare with enum value
# #         raise HTTPException(
# #             status_code=status.HTTP_403_FORBIDDEN,  # Use 403 for authorization failures
# #             detail="Only administrators can perform this action"
# #         )
# #     return user
# async def check_admin(
#     current_user: Annotated[User, Depends(get_current_user)]
# ) -> User:
#     """Check if user is admin"""
#     if current_user.role != UserRole.ADMIN:
#         raise HTTPException(
#             status_code=403,
#             detail="Only administrators can access this resource"
#         )
#     return current_user

# async def check_authenticated_user(
#     current_user: Annotated[User, Depends(get_current_user)]
# ) -> User:
#     """Check if user is authenticated"""
#     return current_user

# async def admin_update_user(
#     username: str,
#     user_update: AdminUserUpdate, 
#     db: Session,
#     current_user: Annotated[User, Depends(check_admin)]
# ) -> User:
#     """Update user role as admin"""
    
#     # Find the user to update
#     user_to_update = db.exec(select(User).where(User.username == username)).first()
#     if not user_to_update:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND, 
#             detail=f"User {username} not found"
#         )
    
#     # Prevent admin from changing their own role
#     if user_to_update.username == current_user.username:
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Admin cannot change their own role"
#         )
    
#     try:
#         # Convert role to enum (ensure it's uppercase)
#         if isinstance(user_update.role, str):
#             new_role = UserRole(user_update.role.upper())
#         else:
#             new_role = user_update.role

#         # Update the user's role
#         user_to_update.role = new_role
#         db.commit()
#         db.refresh(user_to_update)
#         return user_to_update
        
#     except Exception as e:
#         db.rollback()
#         print(f"Error updating role: {str(e)}")  # Debugging info
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error updating user role: {str(e)}"
#         )
# # 







from datetime import timedelta
from jose import JWTError, jwt
from typing import Annotated, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlmodel import Session, select
from db import get_session
from user.settings import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, REFRESH_TOKEN_EXPIRE_MINUTES, SECRET_KEY
from user.services import create_access_token, get_password_hash, get_user_by_username, verify_password, oauth2_scheme
from user.user_models import (
    LoginResponse, 
    TokenData, 
    User, 
    UserCreate,
    UserLogin, 
    UserResponse, 
    UserUpdate,
    UserRole,
    AdminUserUpdate
)

def user_login(db: Session, form_data: UserLogin | OAuth2PasswordRequestForm) -> LoginResponse:
    username = form_data.username
    password = form_data.password
    
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    refresh_token_expires = timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    refresh_token = create_access_token(
        data={"sub": user.username}, expires_delta=refresh_token_expires
    )

    user_response = UserResponse(
        username=user.username,
        email=user.email,
        role=user.role,
        id=user.id
    )

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=int(access_token_expires.total_seconds()),
        token_type="bearer",
        user=user_response
    )


async def signup_user(user_data: UserCreate, db: Session) -> User:
    """
    Create a new user in the database
    """
    # Hash the password
    hashed_password = get_password_hash(user_data.password)
    
    # Create new user instance without specifying the ID (let DB auto-increment)
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        password=hashed_password,
        role=user_data.role
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback()
        raise e

def update_user(user: UserUpdate, session: Session, current_user: User) -> User:
    updated_user = session.exec(select(User).where(User.id == current_user.id)).first()
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = user.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        value = value if key != "password" else get_password_hash(value)
        setattr(updated_user, key, value)
    session.commit()
    session.refresh(updated_user)
    return updated_user

def delete_user(session: Session, username: str) -> dict[str, str]:
    user = session.exec(select(User).where(User.username == username)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    session.delete(user)
    session.commit()
    return {"message": f"User {username} deleted successfully"}

async def get_token_from_cookie_or_header(
    request: Request,
    token_from_header: Annotated[Optional[str], Depends(oauth2_scheme)] = None
) -> str:
    """
    Extract token from either Authorization header or HTTPOnly cookie.
    Preference: Authorization header > access_token cookie
    
    This allows HTTPOnly cookies set by the login endpoint to work
    alongside traditional Authorization headers.
    """
    # First try to get token from Authorization header
    if token_from_header:
        return token_from_header
    
    # Fallback to HTTPOnly cookie (for browser requests)
    token_from_cookie = request.cookies.get("access_token")
    if token_from_cookie:
        return token_from_cookie
    
    # No token found in either location
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials - no token provided",
        headers={"WWW-Authenticate": "Bearer"},
    )

async def get_current_user(
    token: Annotated[str, Depends(get_token_from_cookie_or_header)], 
    db: Annotated[Session, Depends(get_session)]
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
        
    user = get_user_by_username(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

# ==================== SIMPLE ROLE CHECKING SYSTEM ====================

def require_roles(allowed_roles: List[UserRole]):
    """
    Simple role checker - allows access if user has any of the specified roles
    Admin always has access to everything
    """
    def role_checker(current_user: Annotated[User, Depends(get_current_user)]):
        # Admin has access to everything
        if current_user.role == UserRole.ADMIN:
            return current_user
        
        # Check if user has one of the allowed roles
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}"
            )
        
        return current_user
    
    return role_checker

# Pre-defined role checkers for your specific use cases
def require_admin():
    """Only ADMIN can access"""
    return require_roles([UserRole.ADMIN])

def require_admin_principal():
    """ADMIN or PRINCIPAL can access"""
    return require_roles([UserRole.ADMIN, UserRole.PRINCIPAL])

def require_admin_teacher_principal():
    """ADMIN, TEACHER, or PRINCIPAL can access"""
    return require_roles([UserRole.ADMIN, UserRole.TEACHER, UserRole.PRINCIPAL])

def require_admin_teacher_principal_accountant():
    """ADMIN, TEACHER, PRINCIPAL, or ACCOUNTANT can access"""
    return require_roles([UserRole.ADMIN, UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.ACCOUNTANT])

def require_admin_accountant():
    """ADMIN or ACCOUNTANT can access"""
    return require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT])

def require_admin_fee_manager():
    """ADMIN or FEE_MANAGER can access"""
    return require_roles([UserRole.ADMIN, UserRole.FEE_MANAGER])

def require_all_roles():
    """All roles can access (ADMIN, TEACHER, ACCOUNTANT, FEE_MANAGER, PRINCIPAL, USER)"""
    return require_roles([UserRole.ADMIN, UserRole.TEACHER, UserRole.ACCOUNTANT, 
                         UserRole.FEE_MANAGER, UserRole.PRINCIPAL, UserRole.USER])

def require_authenticated():
    """Any authenticated user can access"""
    def checker(current_user: Annotated[User, Depends(get_current_user)]):
        return current_user
    return checker

# ==================== LEGACY FUNCTIONS (for backward compatibility) ====================

async def check_admin_or_teacher(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Legacy function - Check if user is either admin or teacher"""
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        raise HTTPException(
            status_code=403,
            detail="Only administrators and teachers can access this resource"
        )
    return current_user

async def check_admin(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Legacy function - Check if user is admin"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only administrators can access this resource"
        )
    return current_user

async def check_authenticated_user(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Legacy function - Check if user is authenticated"""
    return current_user

# ==================== ADMIN USER MANAGEMENT ====================

async def admin_update_user(
    username: str,
    user_update: AdminUserUpdate, 
    db: Session,
    current_user: Annotated[User, Depends(require_admin)]  # Updated to use new role checker
) -> User:
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
        print(f"Error updating role: {str(e)}")  # Debugging info
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user role: {str(e)}"
        )

# ==================== PER-USER DATA FILTERING (for USER role) ====================

def validate_student_access(current_user: User, requested_student_id: int):
    """
    Validate that a user can access a student's data.
    - ADMIN, PRINCIPAL, TEACHER can access any student's data
    - USER (Student) can only access their own data
    - Raises 403 if unauthorized
    """
    # Admin, Principal, and Teachers can access all student data
    if current_user.role in [UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER]:
        return True
    
    # USER role (Student) can only access their own data
    if current_user.role == UserRole.USER:
        # Assuming user.id represents the student_id for USER role users
        if current_user.id != requested_student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access your own student records"
            )
        return True
    
    # Other roles (ACCOUNTANT, FEE_MANAGER) cannot access student data directly
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Your role does not have permission to access student data"
    )

def can_view_fee_data(current_user: User):
    """
    Check if a user can view fee data.
    - ADMIN, PRINCIPAL, ACCOUNTANT, FEE_MANAGER can view all fees
    - USER (Student) can only view their own fees
    """
    return current_user.role in [UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.ACCOUNTANT, UserRole.FEE_MANAGER, UserRole.USER]

def can_view_attendance_data(current_user: User):
    """
    Check if a user can view attendance data.
    - ADMIN, PRINCIPAL, TEACHER can view all attendance
    - USER (Student) can only view their own attendance
    """
    return current_user.role in [UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER, UserRole.USER]

def require_admin_accountant_fee_manager():
    """ADMIN, ACCOUNTANT, or FEE_MANAGER can access"""
    return require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.FEE_MANAGER])