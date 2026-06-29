from asyncio.log import logger
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError  # <-- Add this import

from db import get_session
from schemas.attendance_time_model import AttendanceTime, AttendanceTimeCreate, AttendanceTimeResponse
from schemas.attendance_model import Attendance
from user.user_crud import require_admin_teacher_principal, require_authenticated
from user.user_models import User
attendance_time_router = APIRouter(
    prefix="/attendance_time",
    tags=["Attendance Time"],
    responses={404: {"Description": "Not found"}}
)


@attendance_time_router.get("/", response_model=dict)
async def root():
    return {"message": "MMS-General service is running", "status": "Attendance Time Router Page running :-)"}


@attendance_time_router.post("/add_attendance_value/", response_model=AttendanceTimeResponse)
def create_attendance_time(user: Annotated[User, Depends(require_admin_teacher_principal)],attendance_time: AttendanceTimeCreate, session: Session = Depends(get_session)):
    db_attendance_time = AttendanceTime(**attendance_time.model_dump())
    session.add(db_attendance_time)

    try:
        session.commit()
        session.refresh(db_attendance_time)
    except IntegrityError as e:
        session.rollback()
        logger.error(f"Integrity error: {e}")
        if "unique constraint" in str(e.orig).lower() or "duplicate key" in str(e.orig).lower():
            raise HTTPException(
                status_code=400, detail="Attendance time or ID must be unique."
            )
        raise HTTPException(
            status_code=400, detail="Database integrity error."
        )
    except Exception as e:
        session.rollback()
        # Log any other unexpected errors
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=500, detail="Internal server error."
        )

    return db_attendance_time

# # Returns all placed attendance_times


@attendance_time_router.get("/attendance-values-all/", response_model=List[AttendanceTimeResponse])
def read_attendance_times(current_user: Annotated[User, Depends(require_authenticated())],session: Session = Depends(get_session)):
    attendance_times = session.exec(select(AttendanceTime)).all()
    return attendance_times

# # Returns attendance_time of any specific attendance_time-id


@attendance_time_router.get("/{attendance_time_id}", response_model=AttendanceTimeResponse)
def read_attendance_time(current_user: Annotated[User, Depends(require_authenticated())],attendance_time_id: int, session: Session = Depends(get_session)):
    attendance_time = session.get(AttendanceTime, attendance_time_id)
    if not attendance_time:
        raise HTTPException(
            status_code=404, detail="Attendance_time not found")
    return attendance_time


@attendance_time_router.delete("/del/{attend_value_name}", response_model=dict)
def delete_attendance_time(user: Annotated[User, Depends(require_admin_teacher_principal)],attend_value_name: str, session: Session = Depends(get_session)):
    attendance_time = session.exec(select(AttendanceTime).where(
        AttendanceTime.attendance_time == attend_value_name)).first()
    # Check for related records (adjust model and field as needed)
    related_records = []  # <-- Replace with actual query if you have related records
    if not attendance_time:
        raise HTTPException(
            status_code=404, detail="Attendance Time not found")
    if related_records:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete: There are records using this attendance time."
        )
    session.delete(attendance_time)
    session.commit()
    return {"message": "Attendance Time deleted successfully"}

@attendance_time_router.delete("/{attendance_time_id}", response_model=dict)
def delete_attendance_time_by_id(
    user: Annotated[User, Depends(require_admin_teacher_principal)],
    attendance_time_id: int, 
    session: Session = Depends(get_session)
):
    """Delete an attendance time by its ID"""
    attendance_time = session.get(AttendanceTime, attendance_time_id)
    if not attendance_time:
        raise HTTPException(
            status_code=404, 
            detail=f"Attendance Time with ID {attendance_time_id} not found"
        )
    # Check for related attendance records
    linked_attendance = session.exec(select(Attendance).where(Attendance.attendance_time_id == attendance_time_id)).first()
    if linked_attendance:
        raise HTTPException(
            status_code=409,
            detail="Please delete related attendance records first before deleting this timing."
        )
    try:
        session.delete(attendance_time)
        session.commit()
        return {"message": f"Attendance Time with ID {attendance_time_id} deleted successfully"}
    except Exception as e:
        session.rollback()
        logger.error(f"Error deleting attendance time: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error deleting attendance time"
        )