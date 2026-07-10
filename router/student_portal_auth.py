import unicodedata
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlmodel import Session, select
from db import get_session
from schemas.students_model import Students
from schemas.student_parent_credentials_model import StudentParentCredential
from schemas.student_profile_model import StudentProfileResponse
from router.student_profile import _build_profile_response
from user.services import create_access_token, get_password_hash, verify_password
from user.user_crud import require_admin
from datetime import datetime
from user.settings import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY, ALGORITHM
from jose import jwt, JWTError
from pydantic import BaseModel

student_portal_auth_router = APIRouter(prefix="/student-portal", tags=["Student Portal"])


class StudentPortalLoginRequest(BaseModel):
    student_name: str
    father_contact: str
    password: str


class StudentPortalChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class StudentPortalTokenData(BaseModel):
    student_id: int
    student_name: str


class StudentPortalLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    student: dict


class AdminResetStudentPasswordRequest(BaseModel):
    student_id: int
    new_password: str


def _get_or_create_credential(session: Session, student: Students) -> StudentParentCredential:
    credential = session.exec(
        select(StudentParentCredential).where(StudentParentCredential.student_id == student.student_id)
    ).first()
    if credential is None:
        credential = StudentParentCredential(
            student_id=student.student_id,
            parent_name=student.father_name,
            parent_mobile=student.father_contact,
            password_hash=get_password_hash("parent123"),
        )
        session.add(credential)
        session.commit()
        session.refresh(credential)
    return credential


def _normalize_text(value: str) -> str:
    return unicodedata.normalize("NFC", value.strip())


@student_portal_auth_router.post("/login", response_model=StudentPortalLoginResponse)
def student_portal_login(payload: StudentPortalLoginRequest, session: Session = Depends(get_session)):
    normalized_name = _normalize_text(payload.student_name)
    normalized_contact = _normalize_text(payload.father_contact)

    candidates = session.exec(
        select(Students).where(Students.father_contact == normalized_contact)
    ).all()

    student = None
    for candidate in candidates:
        if _normalize_text(candidate.student_name) == normalized_name:
            student = candidate
            break

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    credential = _get_or_create_credential(session, student)
    if not credential.is_active:
        raise HTTPException(status_code=403, detail="Student portal access is disabled")
    if not verify_password(payload.password, credential.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")

    access_token = create_access_token(
        data={"sub": f"student:{student.student_id}"},
        expires_delta=__import__('datetime').timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": int(ACCESS_TOKEN_EXPIRE_MINUTES * 60),
        "student": {
            "student_id": student.student_id,
            "student_name": student.student_name,
            "class_name": student.class_name,
            "father_name": student.father_name,
            "father_contact": student.father_contact,
        },
    }


@student_portal_auth_router.post("/change-password")
def change_student_portal_password(
    payload: StudentPortalChangePasswordRequest,
    authorization: Optional[str] = Header(None, alias="Authorization"),
    session: Session = Depends(get_session),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.split(" ", 1)[1]
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    subject = decoded.get("sub")
    if not subject or not str(subject).startswith("student:"):
        raise HTTPException(status_code=401, detail="Invalid token")

    student_id = int(str(subject).split(":", 1)[1])
    credential = session.get(StudentParentCredential, student_id)
    if not credential:
        raise HTTPException(status_code=404, detail="Student portal credentials not found")

    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if not verify_password(payload.current_password, credential.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    credential.password_hash = get_password_hash(payload.new_password)
    credential.updated_at = __import__('datetime').datetime.utcnow()
    session.add(credential)
    session.commit()
    session.refresh(credential)
    return {"message": "Password updated successfully"}


@student_portal_auth_router.get("/me")
def get_student_portal_me(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    session: Session = Depends(get_session),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.split(" ", 1)[1]
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    subject = decoded.get("sub")
    if not subject or not str(subject).startswith("student:"):
        raise HTTPException(status_code=401, detail="Invalid token")

    student_id = int(str(subject).split(":", 1)[1])
    student = session.get(Students, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    return {
        "student_id": student.student_id,
        "student_name": student.student_name,
        "class_name": student.class_name,
        "father_name": student.father_name,
        "father_contact": student.father_contact,
    }


@student_portal_auth_router.get("/profile", response_model=StudentProfileResponse)
def get_student_portal_profile(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    session: Session = Depends(get_session),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.split(" ", 1)[1]
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    subject = decoded.get("sub")
    if not subject or not str(subject).startswith("student:"):
        raise HTTPException(status_code=401, detail="Invalid token")

    student_id = int(str(subject).split(":", 1)[1])
    return _build_profile_response(session, student_id)



@student_portal_auth_router.post("/admin/reset-password")
def admin_reset_student_portal_password(
    payload: AdminResetStudentPasswordRequest,
    current_user=Depends(require_admin()),
    session: Session = Depends(get_session),
):
    # Ensure student exists
    student = session.get(Students, payload.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    credential = session.get(StudentParentCredential, payload.student_id)
    if credential is None:
        credential = StudentParentCredential(
            student_id=payload.student_id,
            parent_name=student.father_name,
            parent_mobile=student.father_contact,
            password_hash=get_password_hash(payload.new_password),
        )
        session.add(credential)
    else:
        credential.password_hash = get_password_hash(payload.new_password)
        credential.updated_at = datetime.utcnow()
        session.add(credential)

    session.commit()
    return {"message": "Student portal password reset successfully"}
