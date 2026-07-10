from datetime import date, datetime, timedelta
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from db import get_session
from schemas.staff_attendance_model import (
    StaffAttendance,
    StaffAttendanceBulkCreate,
    StaffAttendanceBulkResponse,
    StaffAttendanceCreate,
    StaffAttendanceResponse,
    StaffAttendanceRow,
    StaffAttendanceSaveSummary,
    StaffAttendanceUpdate,
    StaffListItem,
)
from schemas.teacher_names_model import TeacherNames
from user.user_crud import require_admin, require_admin_teacher_principal, require_admin_teacher_principal_accountant
from user.user_models import User

staff_router = APIRouter(prefix="/staff", tags=["Staff"], responses={404: {"description": "Staff module"}})

VALID_STATUSES = {"Present", "Absent", "Leave", "Late", "Unmarked"}


def _calculate_total_stay(joining_date: datetime) -> str:
    today = datetime.utcnow().date()
    joined = joining_date.date()
    years = today.year - joined.year
    months = today.month - joined.month
    days = today.day - joined.day

    if days < 0:
        months -= 1
        days += 30
    if months < 0:
        years -= 1
        months += 12

    if years and months:
        return f"{years} years, {months} months, {days} days"
    if years:
        return f"{years} years"
    if months:
        return f"{months} months, {days} days"
    return f"{days} days"


@staff_router.get("/", response_model=dict)
def root() -> dict:
    return {"message": "Staff router is running"}


@staff_router.get("/list", response_model=List[StaffListItem])
def get_staff_list(
    current_user: Annotated[User, Depends(require_admin_teacher_principal_accountant())],
    session: Session = Depends(get_session),
    search: Optional[str] = Query(None),
):
    query = select(TeacherNames)
    if search:
        query = query.where(TeacherNames.teacher_name.ilike(f"%{search}%"))

    staff_members = session.exec(query.order_by(TeacherNames.teacher_name)).all()

    items: List[StaffListItem] = []
    for member in staff_members:
        created_at = member.created_at or datetime.utcnow()
        items.append(
            StaffListItem(
                staff_id=member.teacher_name_id,
                staff_name=member.teacher_name,
                joining_date=created_at,
                total_stay=_calculate_total_stay(created_at),
            )
        )
    return items


@staff_router.get("/attendance", response_model=List[StaffAttendanceRow])
def get_staff_attendance_rows(
    current_user: Annotated[User, Depends(require_admin_teacher_principal_accountant())],
    session: Session = Depends(get_session),
    attendance_date: Optional[date] = Query(None),
):
    selected_date = attendance_date or date.today()
    staff_members = session.exec(select(TeacherNames).order_by(TeacherNames.teacher_name)).all()
    records = session.exec(
        select(StaffAttendance).where(StaffAttendance.attendance_date == selected_date)
    ).all()

    record_map = {record.staff_id: record for record in records}
    rows: List[StaffAttendanceRow] = []
    for member in staff_members:
        record = record_map.get(member.teacher_name_id)
        created_at = member.created_at or datetime.utcnow()
        rows.append(
            StaffAttendanceRow(
                staff_id=member.teacher_name_id,
                staff_name=member.teacher_name,
                joining_date=created_at,
                total_stay=_calculate_total_stay(created_at),
                attendance_id=record.staff_attendance_id if record else None,
                attendance_date=record.attendance_date if record else None,
                attendance_status=record.attendance_status if record else None,
                is_marked=record is not None,
            )
        )
    return rows


@staff_router.post("/attendance", response_model=StaffAttendanceBulkResponse)
def create_staff_attendance_bulk(
    payload: StaffAttendanceBulkCreate,
    current_user: Annotated[User, Depends(require_admin_teacher_principal())],
    session: Session = Depends(get_session),
):
    created_count = 0
    updated_count = 0
    skipped_count = 0

    for record in payload.records:
        if record.attendance_status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid attendance status: {record.attendance_status}")

        existing = session.exec(
            select(StaffAttendance).where(
                StaffAttendance.staff_id == record.staff_id,
                StaffAttendance.attendance_date == payload.attendance_date,
            )
        ).first()
        if existing:
            if existing.attendance_status != record.attendance_status:
                existing.attendance_status = record.attendance_status
                existing.updated_at = datetime.utcnow()
                session.add(existing)
                updated_count += 1
            else:
                skipped_count += 1
            continue

        session.add(
            StaffAttendance(
                staff_id=record.staff_id,
                attendance_date=payload.attendance_date,
                attendance_status=record.attendance_status,
            )
        )
        created_count += 1

    session.commit()

    saved = session.exec(
        select(StaffAttendance).where(StaffAttendance.attendance_date == payload.attendance_date)
    ).all()
    staff_lookup = {member.teacher_name_id: member.teacher_name for member in session.exec(select(TeacherNames)).all()}
    response: List[StaffAttendanceResponse] = []
    for item in saved:
        created_at = session.get(TeacherNames, item.staff_id).created_at if session.get(TeacherNames, item.staff_id) else datetime.utcnow()
        response.append(
            StaffAttendanceResponse(
                staff_attendance_id=item.staff_attendance_id,
                staff_id=item.staff_id,
                attendance_date=item.attendance_date,
                attendance_status=item.attendance_status,
                staff_name=staff_lookup.get(item.staff_id, "Unknown"),
                joining_date=created_at,
                total_stay=_calculate_total_stay(created_at),
                created_at=item.created_at,
                updated_at=item.updated_at,
            )
        )
    return StaffAttendanceBulkResponse(
        summary=StaffAttendanceSaveSummary(
            created_count=created_count,
            updated_count=updated_count,
            skipped_count=skipped_count,
        ),
        records=response,
    )


@staff_router.get("/attendance/history", response_model=List[StaffAttendanceResponse])
def get_staff_attendance_history(
    current_user: Annotated[User, Depends(require_admin_teacher_principal_accountant())],
    session: Session = Depends(get_session),
    staff_id: Optional[int] = Query(None),
    attendance_date: Optional[date] = Query(None),
):
    query = select(StaffAttendance)
    if staff_id is not None:
        query = query.where(StaffAttendance.staff_id == staff_id)
    if attendance_date is not None:
        query = query.where(StaffAttendance.attendance_date == attendance_date)

    records = session.exec(query.order_by(StaffAttendance.attendance_date.desc())).all()
    staff_lookup = {member.teacher_name_id: member.teacher_name for member in session.exec(select(TeacherNames)).all()}
    response: List[StaffAttendanceResponse] = []
    for item in records:
        created_at = session.get(TeacherNames, item.staff_id).created_at if session.get(TeacherNames, item.staff_id) else datetime.utcnow()
        response.append(
            StaffAttendanceResponse(
                staff_attendance_id=item.staff_attendance_id,
                staff_id=item.staff_id,
                attendance_date=item.attendance_date,
                attendance_status=item.attendance_status,
                staff_name=staff_lookup.get(item.staff_id, "Unknown"),
                joining_date=created_at,
                total_stay=_calculate_total_stay(created_at),
                created_at=item.created_at,
                updated_at=item.updated_at,
            )
        )
    return response


@staff_router.put("/attendance/{attendance_id}", response_model=StaffAttendanceResponse)
def update_staff_attendance(
    attendance_id: int,
    payload: StaffAttendanceUpdate,
    current_user: Annotated[User, Depends(require_admin())],
    session: Session = Depends(get_session),
):
    record = session.get(StaffAttendance, attendance_id)
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    if payload.attendance_status is not None:
        if payload.attendance_status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid attendance status: {payload.attendance_status}")
        record.attendance_status = payload.attendance_status
    if payload.attendance_date is not None:
        record.attendance_date = payload.attendance_date
    record.updated_at = datetime.utcnow()
    session.add(record)
    session.commit()
    session.refresh(record)

    teacher = session.get(TeacherNames, record.staff_id)
    created_at = teacher.created_at if teacher else datetime.utcnow()
    return StaffAttendanceResponse(
        staff_attendance_id=record.staff_attendance_id,
        staff_id=record.staff_id,
        attendance_date=record.attendance_date,
        attendance_status=record.attendance_status,
        staff_name=teacher.teacher_name if teacher else "Unknown",
        joining_date=created_at,
        total_stay=_calculate_total_stay(created_at),
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@staff_router.delete("/attendance/{attendance_id}", response_model=dict)
def delete_staff_attendance(
    attendance_id: int,
    current_user: Annotated[User, Depends(require_admin())],
    session: Session = Depends(get_session),
):
    record = session.get(StaffAttendance, attendance_id)
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    session.delete(record)
    session.commit()
    return {"message": "Attendance record deleted successfully"}
