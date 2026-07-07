from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from db import get_session
from schemas.attendance_model import Attendance
from schemas.exam_marks_model import ExamMark
from schemas.fee_model import Fee
from schemas.student_profile_model import StudentProfileRequest, StudentProfileResponse
from schemas.students_model import Students, StudentsResponse
from user.user_crud import get_current_user
from user.user_models import User, UserRole

student_profile_router = APIRouter(
    prefix="/student_profile",
    tags=["Student Profile"],
    responses={404: {"description": "Not found"}},
)


def _build_student_response(student: Students) -> StudentsResponse:
    return StudentsResponse(
        student_id=student.student_id,
        student_name=student.student_name,
        student_date_of_birth=student.student_date_of_birth,
        student_gender=student.student_gender,
        student_age=student.student_age,
        student_education=student.student_education,
        class_name=student.class_name,
        student_city=student.student_city,
        student_address=student.student_address,
        father_name=student.father_name,
        father_occupation=student.father_occupation,
        father_cnic=student.father_cnic,
        father_cast_name=student.father_cast_name,
        father_contact=student.father_contact,
    )


def _build_profile_response(session: Session, student_id: int) -> StudentProfileResponse:
    student = session.exec(select(Students).where(Students.student_id == student_id)).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    attendance_rows = session.exec(
        select(Attendance)
        .where(Attendance.student_id == student_id)
        .order_by(Attendance.attendance_date.desc())
    ).all()

    exam_rows = session.exec(
        select(ExamMark)
        .where(ExamMark.student_id == student_id)
        .order_by(ExamMark.exam_date.desc(), ExamMark.subject_name.asc())
    ).all()

    fee_rows = session.exec(
        select(Fee)
        .where(Fee.student_id == student_id)
        .order_by(Fee.created_at.desc())
    ).all()

    return StudentProfileResponse(
        student=_build_student_response(student),
        attendance=[
            {
                "attendance_id": row.attendance_id,
                "attendance_date": row.attendance_date,
                "attendance_time": row.attendance_time.attendance_time if row.attendance_time else None,
                "attendance_value": row.attendance_value.attendance_value if row.attendance_value else None,
            }
            for row in attendance_rows
        ],
        exams=[
            {
                "exam_id": getattr(row, "exam_mark_id", None) or getattr(row, "exam_id", None),
                "exam_date": row.exam_date,
                "subject_name": row.subject_name,
                "exam_type": row.exam_type,
                "total_marks": row.total_marks,
                "obtained_marks": row.obtained_marks,
            }
            for row in exam_rows
        ],
        fees=[
            {
                "fee_id": row.fee_id,
                "fee_month": row.fee_month,
                "fee_year": row.fee_year,
                "fee_amount": row.fee_amount,
                "fee_status": row.fee_status.value if hasattr(row.fee_status, "value") else row.fee_status,
            }
            for row in fee_rows
        ],
    )


@student_profile_router.get("/", response_model=StudentProfileResponse)
def get_student_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    student_id: int = Query(..., description="Student ID"),
    class_name: Optional[str] = Query(None, description="Optional class filter"),
):
    if current_user.role == UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Students cannot view other student profiles")

    profile = _build_profile_response(session, student_id)
    if class_name and profile.student.class_name != class_name:
        raise HTTPException(status_code=400, detail="Selected class does not match the student record")
    return profile


@student_profile_router.post("/load/", response_model=StudentProfileResponse)
def load_student_profile(
    payload: StudentProfileRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    if current_user.role == UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Students cannot view other student profiles")
    return _build_profile_response(session, payload.student_id)
