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
    AttendanceStatusSummary,
)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy.orm import joinedload
from typing import Annotated, List, Optional
from user.user_models import User, UserRole
from user.user_crud import get_current_user
from sqlalchemy.exc import IntegrityError
from datetime import date, datetime, timedelta

from db import get_session

mark_attendance_router = APIRouter(
    prefix="/mark_attendance",
    tags=["Mark Attendance"],
    responses={404: {"description": "Marking Attendance of Students"}}
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _require_not_user(current_user: User, action: str = "perform this action") -> None:
    """Raise 403 if the caller is a student account."""
    if current_user.role == UserRole.STUDENT:
        raise HTTPException(status_code=403, detail=f"Students cannot {action}")


def _parse_date(date_str: str, field_name: str = "date") -> datetime:
    """Parse a YYYY-MM-DD string to datetime; raise 400 on bad format."""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name} format. Expected YYYY-MM-DD, got '{date_str}'"
        )


def _build_response(att: Attendance) -> FilteredAttendanceResponse:
    """Safely build a FilteredAttendanceResponse from an ORM object."""
    return FilteredAttendanceResponse(
        attendance_id=att.attendance_id,
        attendance_date=att.attendance_date,
        attendance_time=att.attendance_time.attendance_time if att.attendance_time else "N/A",
        attendance_class=att.attendance_class.class_name if att.attendance_class else "N/A",
        attendance_teacher=att.attendance_teacher.teacher_name if att.attendance_teacher else "N/A",
        attendance_student=att.attendance_student.student_name if att.attendance_student else "N/A",
        attendance_std_fname=att.attendance_student.father_name if att.attendance_student else "N/A",
        attendance_value=att.attendance_value.attendance_value if att.attendance_value else "N/A",
    )


def _eager_select() -> any:
    """Return a select(Attendance) with all relationships eagerly loaded."""
    return select(Attendance).options(
        joinedload(Attendance.attendance_time),
        joinedload(Attendance.attendance_class),
        joinedload(Attendance.attendance_teacher),
        joinedload(Attendance.attendance_student),
        joinedload(Attendance.attendance_value),
    )


# ─── Show All (paginated) ─────────────────────────────────────────────────────

@mark_attendance_router.get("/show_all_attendance", response_model=dict)
def get_all_attendance(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=10, ge=1, le=50, description="Records per page"),
):
    """View all attendance records with role-based access (paginated)."""
    _require_not_user(current_user, "view attendance records")

    from sqlalchemy import func
    total = session.exec(select(func.count(Attendance.attendance_id))).one()

    stmt = _eager_select().offset((page - 1) * page_size).limit(page_size)
    records = session.exec(stmt).unique().all()

    return {
        "data": [_build_response(att) for att in records],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


# ─── Add Single Attendance ────────────────────────────────────────────────────

@mark_attendance_router.post("/add_attendance/", response_model=FilteredAttendanceResponse)
def add_attendance(
    create_attendance: AttendanceCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """Add a single attendance record."""
    _require_not_user(current_user, "add attendance records")

    data = create_attendance.model_dump()
    student_id = data["student_id"]
    attendance_date = data["attendance_date"]
    attendance_time_id = data.get("attendance_time_id")

    # Duplicate check: same student + date + time slot
    where_clause = [
        Attendance.student_id == student_id,
        Attendance.attendance_date == attendance_date,
    ]
    if attendance_time_id is not None:
        where_clause.append(Attendance.attendance_time_id == attendance_time_id)

    existing = session.exec(select(Attendance).where(*where_clause)).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Attendance already marked for student {student_id} on {attendance_date}",
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
            detail=f"Attendance already marked for student {student_id} on {attendance_date}",
        )

    # FIX 3: re-fetch with eager loading so relationships are available for the response
    saved = session.exec(
        _eager_select().where(Attendance.attendance_id == db_attendance.attendance_id)
    ).first()
    return _build_response(saved)


# ─── Bulk Attendance ──────────────────────────────────────────────────────────

@mark_attendance_router.post("/add_bulk_attendance/", response_model=dict)
def add_bulk_attendance(
    bulk: BulkAttendanceCreate,
    session: Session = Depends(get_session),
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    saved = []
    skipped = []
    today = date.today()

    for attendance in bulk.attendances:
        att_date = (
            attendance.attendance_date.date()
            if hasattr(attendance.attendance_date, "date")
            else attendance.attendance_date
        )

        if att_date > today:
            skipped.append({
                "student_id": attendance.student_id,
                "reason": f"Future date {att_date} not allowed",
            })
            continue

        # FIX 4: use session.exec (SQLModel style) instead of session.query (legacy)
        exists = session.exec(
            select(Attendance).where(
                Attendance.student_id == attendance.student_id,
                Attendance.attendance_date == attendance.attendance_date,
                Attendance.attendance_time_id == attendance.attendance_time_id,
                Attendance.teacher_name_id == attendance.teacher_name_id,
            )
        ).first()

        if exists:
            skipped.append({
                "student_id": attendance.student_id,
                "reason": "Already marked for this date & time",
            })
            continue

        db_attendance = Attendance(
            student_id=attendance.student_id,
            attendance_date=attendance.attendance_date,
            attendance_time_id=attendance.attendance_time_id,
            teacher_name_id=attendance.teacher_name_id,
            class_name_id=attendance.class_name_id,
            attendance_value_id=attendance.attendance_value_id,
        )
        session.add(db_attendance)
        saved.append({"student_id": attendance.student_id, "status": "Saved"})

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
        },
    }


# ─── Delete ───────────────────────────────────────────────────────────────────

@mark_attendance_router.delete("/delete_attendance/{attendance_id}", response_model=str)
def delete_attendance(
    attendance_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    _require_not_user(current_user, "delete attendance records")

    attendance = session.get(Attendance, attendance_id)
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    session.delete(attendance)
    session.commit()
    return f"Attendance record with ID {attendance_id} deleted successfully."


# ─── Update ───────────────────────────────────────────────────────────────────

@mark_attendance_router.patch("/update_attendance/{attendance_id}", response_model=FilteredAttendanceResponse)
def update_attendance(
    attendance_id: int,
    attendance_update: AttendanceUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    _require_not_user(current_user, "update attendance records")

    db_attendance = session.get(Attendance, attendance_id)
    if not db_attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    attendance_data = attendance_update.model_dump(exclude_unset=True)
    for key, value in attendance_data.items():
        setattr(db_attendance, key, value)

    session.add(db_attendance)
    session.commit()

    # FIX 5: re-fetch with eager loading after update (same fix as add_attendance)
    updated = session.exec(
        _eager_select().where(Attendance.attendance_id == attendance_id)
    ).first()
    return _build_response(updated)


# ─── Filter by IDs ───────────────────────────────────────────────────────────

@mark_attendance_router.get("/filter_attendance_by_ids", response_model=dict)
def filter_attendance_by_ids(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
    attendance_date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    attendance_time_id: Optional[int] = Query(None, description="Filter by Attendance Time ID"),
    class_name_id: Optional[int] = Query(None, description="Filter by Class Name ID"),
    teacher_name_id: Optional[int] = Query(None, description="Filter by Teacher Name ID"),
    student_id: Optional[int] = Query(None, description="Filter by Student ID"),
    father_name: Optional[str] = Query(None, description="Filter by Father's Name"),
    attendance_value_id: Optional[int] = Query(None, description="Filter by Attendance Value ID"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
):
    """Filter attendance by IDs with role-based access."""
    _require_not_user(current_user, "view attendance records")

    query = _eager_select()

    # Teacher users can view attendance records with the same access as admin and principal.
    # Any specific teacher_name_id filters will still apply when passed explicitly.
    if attendance_date:
        date_obj = _parse_date(attendance_date, "attendance_date")
        query = query.where(
            Attendance.attendance_date >= date_obj,
            Attendance.attendance_date < date_obj + timedelta(days=1),
        )
    if attendance_time_id:
        query = query.where(Attendance.attendance_time_id == attendance_time_id)
    if class_name_id:
        query = query.where(Attendance.class_name_id == class_name_id)
    if teacher_name_id:
        query = query.where(Attendance.teacher_name_id == teacher_name_id)
    if student_id:
        query = query.where(Attendance.student_id == student_id)
    if father_name:
        query = query.join(Students).where(Students.father_name == father_name)
    if attendance_value_id:
        query = query.where(Attendance.attendance_value_id == attendance_value_id)

    records = session.exec(query).unique().all()
    total = len(records)

    paginated = records[(page - 1) * page_size : page * page_size]

    if not paginated:
        raise HTTPException(
            status_code=404, detail="No attendance records found matching the criteria"
        )

    return {
        "data": [_build_response(att) for att in paginated],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


# ─── Filter by Names ─────────────────────────────────────────────────────────

@mark_attendance_router.get("/filtered_attendance_by_name", response_model=List[FilteredAttendanceResponse])
def get_filtered_attendance_by_name(                       # FIX 1 (continued): unique function name
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
    class_name: Optional[str] = Query(None, description="Filter by Class name"),
    teacher_name: Optional[str] = Query(None, description="Filter by Teacher name"),
    student_name: Optional[str] = Query(None, description="Filter by Student name"),
    attendance_value: Optional[str] = Query(None, description="Filter by Attendance value"),
    attendance_date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    attendance_time: Optional[str] = Query(None, description="Filter by Attendance time"),
    attendance_id: Optional[int] = Query(None, description="Filter by Attendance ID"),
):
    """Filter attendance records by name fields."""
    _require_not_user(current_user, "view attendance records")

    query = _eager_select()

    # Teacher users can view attendance records with the same access as admin and principal.
    # Any specific teacher_name filters will still apply when passed explicitly.
    if class_name:
        query = query.join(Attendance.attendance_class).where(ClassNames.class_name == class_name)
    if teacher_name:
        query = query.join(Attendance.attendance_teacher).where(TeacherNames.teacher_name == teacher_name)
    if student_name:
        query = query.join(Attendance.attendance_student).where(Students.student_name == student_name)
    if attendance_value:
        query = query.join(Attendance.attendance_value).where(
            AttendanceValue.attendance_value == attendance_value
        )
    # FIX 9: parse date string and use range comparison for datetime column
    if attendance_date:
        date_obj = _parse_date(attendance_date, "attendance_date")
        query = query.where(
            Attendance.attendance_date >= date_obj,
            Attendance.attendance_date < date_obj + timedelta(days=1),
        )
    if attendance_time:
        query = query.join(Attendance.attendance_time).where(
            AttendanceTime.attendance_time == attendance_time
        )
    if attendance_id:
        query = query.where(Attendance.attendance_id == attendance_id)

    records = session.exec(query).unique().all()

    if not records:
        raise HTTPException(
            status_code=404, detail="No attendance records found matching the criteria"
        )

    # FIX 10: use _build_response so all null guards are applied (was missing before)
    return [_build_response(att) for att in records]



# ─── Attendance Status Summary ────────────────────────────────────────────────

@mark_attendance_router.get("/attendance_status_summary", response_model=AttendanceStatusSummary)
def get_attendance_status_summary(
    current_user: Annotated[User, Depends(get_current_user)],   # FIX 11: removed = None default
    session: Session = Depends(get_session),
    student_id: int = Query(..., description="Student ID"),
    from_date: Optional[str] = Query(None, description="From date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="To date (YYYY-MM-DD)"),
):
    """Get attendance status summary (present / absent / late / leave) for a student."""
    _require_not_user(current_user, "view attendance summaries")

    student = session.get(Students, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # FIX 12: eager-load attendance_value to avoid N+1 queries
    query = (
        select(Attendance)
        .options(joinedload(Attendance.attendance_value))
        .where(Attendance.student_id == student_id)
    )

    if from_date:
        from_dt = _parse_date(from_date, "from_date")
        query = query.where(Attendance.attendance_date >= from_dt)

    if to_date:
        to_dt = _parse_date(to_date, "to_date")
        # Include the full to_date day
        query = query.where(Attendance.attendance_date < to_dt + timedelta(days=1))

    records = session.exec(query).all()

    present_count = absent_count = late_count = leave_count = 0

    for record in records:
        if record.attendance_value:
            val = record.attendance_value.attendance_value.lower()
            if val == "present":
                present_count += 1
            elif val == "absent":
                absent_count += 1
            elif val == "late":
                late_count += 1
            elif val == "leave":
                leave_count += 1

    return AttendanceStatusSummary(
        student_id=student.student_id,
        student_name=student.student_name,
        father_name=student.father_name,
        class_name=student.class_name if student.class_name else "N/A",
        present=present_count,
        absent=absent_count,
        late=late_count,
        leave=leave_count,
        total=present_count + absent_count + late_count + leave_count,
        date_range={
            "from": from_date or "N/A",
            "to": to_date or "N/A",
        },
    )