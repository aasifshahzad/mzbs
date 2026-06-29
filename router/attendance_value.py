from sqlalchemy import text
from asyncio.log import logger
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError  # <-- Add this import

from db import get_session
from schemas.attendance_value_model import AttendanceValue, AttendanceValueCreate, AttendanceValueResponse
from user.user_crud import require_admin_teacher_principal, require_authenticated
from user.user_models import User
attendancevalue_router = APIRouter(
    prefix="/attendance_value",
    tags=["Attendance Value"],
    responses={404: {"Description": "Not found"}}
)


@attendancevalue_router.get("/", response_model=dict)
async def root():
    return {"message": "MMS-General service is running", "status": "Attendance Value Router Page running :-)"}


@attendancevalue_router.post("/add_attendance_value/", response_model=AttendanceValueResponse)
def create_attendancevalue(user: Annotated[User, Depends(require_admin_teacher_principal())],attendancevalue: AttendanceValueCreate, session: Session = Depends(get_session)):
    db_attendancevalue = AttendanceValue(**attendancevalue.model_dump())
    session.add(db_attendancevalue)

    try:
        session.commit()
        session.refresh(db_attendancevalue)
    except IntegrityError as e:
        session.rollback()
        logger.error(f"Integrity error: {e}")
        if "unique constraint" in str(e.orig).lower() or "duplicate key" in str(e.orig).lower():
            raise HTTPException(
                status_code=400, detail="Attendance value or ID must be unique."
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

    return db_attendancevalue

# # Returns all placed attendancevalues


@attendancevalue_router.get("/attendance-values-all/", response_model=List[AttendanceValueResponse])
def read_attendancevalues(current_user: Annotated[User, Depends(require_authenticated())],session: Session = Depends(get_session)):
    attendancevalues = session.exec(select(AttendanceValue)).all()
    return attendancevalues

# # Returns attendancevalue of any specific attendancevalue-id


@attendancevalue_router.get("/{attendancevalue_id}", response_model=AttendanceValueResponse)
def read_attendancevalue(current_user: Annotated[User, Depends(require_authenticated())],attendancevalue_id: int, session: Session = Depends(get_session)):
    attendancevalue = session.get(AttendanceValue, attendancevalue_id)
    if not attendancevalue:
        raise HTTPException(
            status_code=404, detail="Attendancevalue not found")
    return attendancevalue


@attendancevalue_router.delete("/del/{attend_value_name}", response_model=dict)
def delete_attendancevalue(user: Annotated[User, Depends(require_admin_teacher_principal())],attend_value_name: str, session: Session = Depends(get_session)):
    attendancevalue = session.exec(select(AttendanceValue).where(
        AttendanceValue.attendance_value == attend_value_name)).first()
    # Check for related records (adjust model and field as needed)
    related_records = []  # <-- Replace with actual query if you have related records
    if not attendancevalue:
        raise HTTPException(
            status_code=404, detail="Attendance Value not found")
    if related_records:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete: There are records using this attendance value."
        )
    session.delete(attendancevalue)
    session.commit()
    return {"message": "Attendance Value deleted successfully"}

@attendancevalue_router.delete("/{attendance_value_id}", response_model=dict)
def delete_attendancevalue_by_id(
    user: Annotated[User, Depends(require_admin_teacher_principal())],
    attendance_value_id: int, 
    session: Session = Depends(get_session)
):
    """Delete an attendance value by its ID"""
    attendancevalue = session.get(AttendanceValue, attendance_value_id)
    # Check for related records (adjust model and field as needed)
    related_records = []  # <-- Replace with actual query if you have related records
    if not attendancevalue:
        raise HTTPException(
            status_code=404, 
            detail=f"Attendance Value with ID {attendance_value_id} not found"
        )
    if related_records:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete: There are records using this attendance value."
        )
    try:
        session.delete(attendancevalue)
        session.commit()
        return {"message": f"Attendance Value with ID {attendance_value_id} deleted successfully"}
    except Exception as e:
        session.rollback()
        logger.error(f"Error deleting attendance value: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error deleting attendance value"
        )

@attendancevalue_router.post("/reset_attendance_id", response_model=str)
def reset_attendance_id(current_user: Annotated[User, Depends(require_authenticated())],session: Session = Depends(get_session)):
    # Delete all attendance records
    session.exec(select(AttendanceValue)).all()  # Fetch all records
    # Adjust the table name as necessary
    session.exec("DELETE FROM attendancevalue")
    session.commit()

    # Reset the sequence (if using PostgreSQL)
    # Adjust the sequence name as necessary
    session.exec("ALTER SEQUENCE attendance_attendance_id_seq RESTART WITH 1")
    session.commit()

    return "Attendance IDs have been reset to start from 1."


