from schemas.attendance_model import (
    Attendance,
    AttendanceCreate,
    AttendanceTime,
    AttendanceUpdate,
    BulkAttendanceCreate,
    ClassNames,
    FilteredAttendanceResponse,
    TeacherNames,
    Students,
    AttendanceValue,
)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy import and_
from sqlalchemy.orm import joinedload
from typing import Annotated, List, Optional
from user.user_models import User, UserRole
from user.user_crud import get_current_user
from sqlalchemy.exc import IntegrityError

from db import get_session
from user.user_models import User

mark_attendance_router = APIRouter(
    prefix="/mark_attendance",
    tags=["Mark Attendance"],
    responses={404: {"description": "Marking Attendance of Students"}}
)

@mark_attendance_router.get("/show_all_attendance", response_model=List[FilteredAttendanceResponse])
def get_filtered_attendance(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session)
):
    """View attendance with role-based access"""
    # Only check if user is USER, both TEACHER and ADMIN can view all
    if current_user.role == UserRole.USER:
        raise HTTPException(
            status_code=403,
            detail="Users cannot view attendance records"
        )

    # Use eager loading to fetch relationships and handle optional relationships
    stmt = select(Attendance).options(
        joinedload(Attendance.attendance_time),
        joinedload(Attendance.attendance_class),
        joinedload(Attendance.attendance_teacher),
        joinedload(Attendance.attendance_student),
        joinedload(Attendance.attendance_value)
    )

    attendance_records = session.exec(stmt).unique().all()
    if not attendance_records:
        raise HTTPException(status_code=404, detail="No attendance records found")

    result = []
    for att in attendance_records:
        # Safely access optional relationships
        result.append(FilteredAttendanceResponse(
            attendance_id=att.attendance_id,
            attendance_date=att.attendance_date,
            attendance_time=att.attendance_time.attendance_time if att.attendance_time else "N/A",
            attendance_class=att.attendance_class.class_name if att.attendance_class else "N/A",
            attendance_teacher=att.attendance_teacher.teacher_name if att.attendance_teacher else "N/A",
            attendance_student=att.attendance_student.student_name if att.attendance_student else "N/A",
            attendance_std_fname=att.attendance_student.father_name if att.attendance_student else "N/A",
            attendance_value=att.attendance_value.attendance_value if att.attendance_value else "N/A",
        ))

    return result

@mark_attendance_router.post("/add_attendance/", response_model=FilteredAttendanceResponse)
def add_attendance(
    create_attendance: AttendanceCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session)
):
    """Add attendance with role-based permissions"""
    if current_user.role == UserRole.USER:
        raise HTTPException(
            status_code=403,
            detail="Users cannot add attendance records"
        )

    data = create_attendance.model_dump()
    student_id = data.get("student_id")
    attendance_date = data.get("attendance_date")
    attendance_time_id = data.get("attendance_time_id", None)

    # Prevent duplicates: student + date (+ time if provided)
    where_clause = [Attendance.student_id == student_id, Attendance.attendance_date == attendance_date]
    if attendance_time_id is not None:
        where_clause.append(Attendance.attendance_time_id == attendance_time_id)

    existing = session.exec(select(Attendance).where(*where_clause)).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Attendance already marked for student {student_id} on {attendance_date}"
        )

    db_attendance = Attendance(**data)
    try:
        session.add(db_attendance)
        session.commit()
        session.refresh(db_attendance)
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Attendance already marked for student {student_id} on {attendance_date}"
        )

    return FilteredAttendanceResponse(
        attendance_id=db_attendance.attendance_id,
        attendance_date=db_attendance.attendance_date,
        attendance_time=db_attendance.attendance_time.attendance_time,
        attendance_class=db_attendance.attendance_class.class_name,
        attendance_teacher=db_attendance.attendance_teacher.teacher_name,
        attendance_student=db_attendance.attendance_student.student_name,
        attendance_std_fname=db_attendance.attendance_student.father_name,
        attendance_value=db_attendance.attendance_value.attendance_value,
    )

from datetime import date
from fastapi import HTTPException

from datetime import date

@mark_attendance_router.post("/add_bulk_attendance/", response_model=dict)
def add_bulk_attendance(
    bulk: BulkAttendanceCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    saved = []
    skipped = []

    today = date.today()

    for attendance in bulk.attendances:
        # Ensure both are date objects
        att_date = attendance.attendance_date.date() if hasattr(attendance.attendance_date, "date") else attendance.attendance_date

        # ✅ 1. Prevent marking attendance for future dates
        if att_date > today:
            skipped.append({
                "student_id": attendance.student_id,
                "reason": f"Future date {att_date} not allowed"
            })
            continue

        # ✅ 2. Check for duplicates
        exists = session.query(Attendance).filter(
            Attendance.student_id == attendance.student_id,
            Attendance.attendance_date == attendance.attendance_date,
            Attendance.attendance_time_id == attendance.attendance_time_id,
            Attendance.teacher_name_id == attendance.teacher_name_id,
        ).first()

        if exists:
            skipped.append({
                "student_id": attendance.student_id,
                "reason": "Already marked for this date & time"
            })
            continue

        # ✅ 3. Save valid record
        db_attendance = Attendance(
            student_id=attendance.student_id,
            attendance_date=attendance.attendance_date,
            attendance_time_id=attendance.attendance_time_id,
            teacher_name_id=attendance.teacher_name_id,
            class_name_id=attendance.class_name_id,
            attendance_value_id=attendance.attendance_value_id,
        )
        session.add(db_attendance)
        saved.append({
            "student_id": attendance.student_id,
            "status": "Saved"
        })

    try:
        session.commit()
    except IntegrityError as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e.orig))

    return {
        "saved": saved,
        "skipped": skipped,
        "summary": {
            "total": len(bulk.attendances),
            "saved": len(saved),
            "skipped": len(skipped),
        }
    }

@mark_attendance_router.delete("/delete_attendance/{attendance_id}", response_model=str)
def delete_attendance(
    attendance_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session)
):
    """Delete attendance with role-based permissions"""
    if current_user.role == UserRole.USER:
        raise HTTPException(
            status_code=403,
            detail="Users cannot delete attendance records"
        )

    attendance = session.get(Attendance, attendance_id)
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    session.delete(attendance)
    session.commit()
    return f"Attendance record with ID {attendance_id} deleted successfully."

@mark_attendance_router.patch("/update_attendance/{attendance_id}", response_model=FilteredAttendanceResponse)
def update_attendance(
    attendance_id: int,
    attendance_update: AttendanceUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session)
):
    """Update attendance with role-based permissions"""
    if current_user.role == UserRole.USER:
        raise HTTPException(
            status_code=403,
            detail="Users cannot update attendance records"
        )

    db_attendance = session.get(Attendance, attendance_id)
    if not db_attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    attendance_data = attendance_update.model_dump(exclude_unset=True)
    for key, value in attendance_data.items():
        setattr(db_attendance, key, value)

    session.add(db_attendance)
    session.commit()
    session.refresh(db_attendance)

    return FilteredAttendanceResponse(
        attendance_id=db_attendance.attendance_id,
        attendance_date=db_attendance.attendance_date,
        attendance_time=db_attendance.attendance_time.attendance_time,
        attendance_class=db_attendance.attendance_class.class_name,
        attendance_teacher=db_attendance.attendance_teacher.teacher_name,
        attendance_student=db_attendance.attendance_student.student_name,
        attendance_std_fname=db_attendance.attendance_student.father_name,
        attendance_value=db_attendance.attendance_value.attendance_value
    )

@mark_attendance_router.get("/filter_attendance_by_ids", response_model=List[FilteredAttendanceResponse])
def filter_attendance_by_ids(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
    attendance_date: Optional[str] = Query(None, description="Filter by Attendance date"),
    attendance_time_id: Optional[int] = Query(None, description="Filter by Attendance Time ID"),
    class_name_id: Optional[int] = Query(None, description="Filter by Class Name ID"),
    teacher_name_id: Optional[int] = Query(None, description="Filter by Teacher Name ID"),
    student_id: Optional[int] = Query(None, description="Filter by Student ID"),
    father_name: Optional[str] = Query(None, description="Filter by Father's Name"),
    attendance_value_id: Optional[int] = Query(None, description="Filter by Attendance Value ID"),
):
    """Filter attendance with role-based access"""
    # Start with a base select statement with eager loading
    query = select(Attendance).options(
        joinedload(Attendance.attendance_time),
        joinedload(Attendance.attendance_class),
        joinedload(Attendance.attendance_teacher),
        joinedload(Attendance.attendance_student),
        joinedload(Attendance.attendance_value)
    )

    # Add role-based filters first
    if current_user.role == UserRole.USER:
        raise HTTPException(
            status_code=403,
            detail="Users cannot view attendance records"
        )
    elif current_user.role == UserRole.TEACHER:
        teacher = session.exec(
            select(TeacherNames)
            .where(TeacherNames.teacher_name == current_user.username)
        ).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher record not found")
        query = query.where(Attendance.teacher_name_id == teacher.teacher_name_id)

    # Apply the rest of the filters
    if attendance_date:
        query = query.where(Attendance.attendance_date == attendance_date)
    if attendance_time_id and attendance_time_id != 0:
        query = query.where(Attendance.attendance_time_id == attendance_time_id)
    if class_name_id and class_name_id != 0:
        query = query.where(Attendance.class_name_id == class_name_id)
    if teacher_name_id and teacher_name_id != 0:
        query = query.where(Attendance.teacher_name_id == teacher_name_id)
    if student_id and student_id != 0:
        query = query.where(Attendance.student_id == student_id)
    if father_name:
        query = query.join(Students).where(Students.father_name == father_name)
    if attendance_value_id and attendance_value_id != 0:
        query = query.where(Attendance.attendance_value_id == attendance_value_id)

    # Execute the query
    filtered_attendance = session.exec(query).unique().all()

    if not filtered_attendance:
        raise HTTPException(
            status_code=404,
            detail="No attendance records found matching the criteria"
        )

    # Build response with safe relationship access
    filtered_responses = []
    for att in filtered_attendance:
        # Safely access optional relationships
        filtered_responses.append(FilteredAttendanceResponse(
            attendance_id=att.attendance_id,
            attendance_date=att.attendance_date,
            attendance_time=att.attendance_time.attendance_time if att.attendance_time else "N/A",
            attendance_class=att.attendance_class.class_name if att.attendance_class else "N/A",
            attendance_teacher=att.attendance_teacher.teacher_name if att.attendance_teacher else "N/A",
            attendance_student=att.attendance_student.student_name if att.attendance_student else "N/A",
            attendance_std_fname=att.attendance_student.father_name if att.attendance_student else "N/A",
            attendance_value=att.attendance_value.attendance_value if att.attendance_value else "N/A"
        ))

    return filtered_responses

# @mark_attendance_router.get("/filtered_attendance_by_name", response_model=List[FilteredAttendanceResponse])
# def get_filtered_attendance(
#     current_user: Annotated[User, Depends(get_current_user)],
#     session: Session = Depends(get_session),
#     class_name: Optional[str] = Query(None, description="Filter by Class name"),
#     teacher_name: Optional[str] = Query(None, description="Filter by Teacher name"),
#     student_name: Optional[str] = Query(None, description="Filter by Student name"),
#     attendance_value: Optional[str] = Query(None, description="Filter by Attendance value"),
#     attendance_date: Optional[str] = Query(None, description="Filter by Attendance date"),
#     attendance_time: Optional[str] = Query(None, description="Filter by Attendance time"),
#     attendance_id: Optional[int] = Query(None, description="Filter by Attendance ID"),
# ):
#     # Add role check
#     if current_user.role == UserRole.USER:
#         raise HTTPException(
#             status_code=403,
#             detail="Users cannot view attendance records"
#         )
    
#     query = session.exec(Attendance)

#     if class_name:
#         query = query.filter(Attendance.attendance_class.has(class_name=class_name))
#     if teacher_name:
#         query = query.filter(Attendance.attendance_teacher.has(teacher_name=teacher_name))
#     if student_name:
#         query = query.filter(Attendance.attendance_student.has(student_name=student_name))
#     if attendance_value:
#         query = query.filter(Attendance.attendance_value.has(attendance_value=attendance_value))
#     if attendance_date:
#         query = query.filter(Attendance.attendance_date == attendance_date)
#     if attendance_time:
#         query = query.filter(Attendance.attendance_time.has(attendance_time=attendance_time))
#     if attendance_id:
#         query = query.filter(Attendance.attendance_id == attendance_id)

#     filtered_attendance = query.all()

#     filtered_responses = []
#     for db_attendance in filtered_attendance:
#         filtered_response = FilteredAttendanceResponse(
#             attendance_id=db_attendance.attendance_id,
#             attendance_date=db_attendance.attendance_date,
#             attendance_time=db_attendance.attendance_time.attendance_time,
#             attendance_class=db_attendance.attendance_class.class_name,
#             attendance_teacher=db_attendance.attendance_teacher.teacher_name,
#             attendance_student=db_attendance.attendance_student.student_name,
#             attendance_std_fname=db_attendance.attendance_student.father_name,
#             attendance_value=db_attendance.attendance_value.attendance_value
#         )
#         filtered_responses.append(filtered_response)

#     if not filtered_responses:
#         raise HTTPException(status_code=404, detail="No attendance records found matching the criteria")

#     return filtered_responses


@mark_attendance_router.get("/filtered_attendance_by_name", response_model=List[FilteredAttendanceResponse])
def get_filtered_attendance(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
    class_name: Optional[str] = Query(None, description="Filter by Class name"),
    teacher_name: Optional[str] = Query(None, description="Filter by Teacher name"),
    student_name: Optional[str] = Query(None, description="Filter by Student name"),
    attendance_value: Optional[str] = Query(None, description="Filter by Attendance value"),
    attendance_date: Optional[str] = Query(None, description="Filter by Attendance date"),
    attendance_time: Optional[str] = Query(None, description="Filter by Attendance time"),
    attendance_id: Optional[int] = Query(None, description="Filter by Attendance ID"),
):
    """Filter attendance records by name fields"""
    # Add role check
    if current_user.role == UserRole.USER:
        raise HTTPException(
            status_code=403,
            detail="Users cannot view attendance records"
        )
    
    # Start with a base select statement
    query = select(Attendance)

    # Apply filters
    if class_name:
        query = query.join(Attendance.attendance_class).filter(ClassNames.class_name == class_name)
    if teacher_name:
        query = query.join(Attendance.attendance_teacher).filter(TeacherNames.teacher_name == teacher_name)
    if student_name:
        query = query.join(Attendance.attendance_student).filter(Students.student_name == student_name)
    if attendance_value:
        query = query.join(Attendance.attendance_value).filter(AttendanceValue.attendance_value == attendance_value)
    if attendance_date:
        query = query.filter(Attendance.attendance_date == attendance_date)
    if attendance_time:
        query = query.join(Attendance.attendance_time).filter(AttendanceTime.attendance_time == attendance_time)
    if attendance_id:
        query = query.filter(Attendance.attendance_id == attendance_id)

    # Execute the query
    filtered_attendance = session.exec(query).all()

    if not filtered_attendance:
        raise HTTPException(
            status_code=404, 
            detail="No attendance records found matching the criteria"
        )

    # Convert to response model
    filtered_responses = [
        FilteredAttendanceResponse(
            attendance_id=db_attendance.attendance_id,
            attendance_date=db_attendance.attendance_date,
            attendance_time=db_attendance.attendance_time.attendance_time,
            attendance_class=db_attendance.attendance_class.class_name,
            attendance_teacher=db_attendance.attendance_teacher.teacher_name,
            attendance_student=db_attendance.attendance_student.student_name,
            attendance_std_fname=db_attendance.attendance_student.father_name,
            attendance_value=db_attendance.attendance_value.attendance_value
        ) for db_attendance in filtered_attendance
    ]

    return filtered_responses