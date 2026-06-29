from datetime import datetime
from schemas.admission_model import (
    Admission,
    AdmissionCreate,
    AdmissionResponse,
    DeletedStudents,
    Students,
    Termination,
    TerminationResponse,
)
from schemas.attendance_model import Attendance

from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg2 import IntegrityError
from sqlmodel import Session, select
from typing import Annotated, List


from db import get_session
from user.user_crud import require_admin
from user.user_models import User


adm_del_router = APIRouter(
    prefix="/adm_del",
    tags=["Admission & Deletion"],
    responses={404: {"description": "Student Admission / Deletion Management"}})


@adm_del_router.post("/admission_create/", response_model=AdmissionResponse)
def add_admission(user: Annotated[User, Depends(require_admin())],create_admission: AdmissionCreate, session: Session = Depends(get_session)):
    # Create a new Admission record using dictionary unpacking
    db_admission = Admission(**create_admission.model_dump())

    if not db_admission:
        raise HTTPException(
            status_code=400,
            detail="An error occurred while processing the admission. Please provide a valid student ID.")

    # Add the new admission record to the session and commit
    session.add(db_admission)
    session.commit()
    session.refresh(db_admission)

    return db_admission


@adm_del_router.delete("/admission_del/{admission_id}", response_model=str)
def delete_attendance(user: Annotated[User, Depends(require_admin())],admission_id: int, session: Session = Depends(get_session)):
    # Query to find the attendance record by ID
    db_admission = session.get(Admission, admission_id)
    if not db_admission:
        # Raise an error if attendance record is not found
        raise HTTPException(
            status_code=404, detail="Admission record not found")

    # Delete the record if found
    session.delete(db_admission)
    session.commit()  # Commit to save changes
    return f"Attendance record with ID {admission_id} deleted successfully."


# Router endpoint to create a termination record for a student
# @adm_del_router.post("/termination/", response_model=TerminationResponse)
# def terminate_student(
#     admission_id: int,
#     termination_reason: str,
#     session: Session = Depends(get_session)
# ):
#     # Retrieve the Admission record based on the provided admission_id
#     db_admission = session.get(Admission, admission_id)
#     if not db_admission:
#         # Raise an error if admission record is not found
#         raise HTTPException(
#             status_code=404, detail="Admission record not found, please provide a correct Admission ID"
#         )

#     # Calculate total_stay in days based on admission_date and termination_date
#     termination_date = datetime.now()
#     total_stay = (termination_date - db_admission.admission_date).days

#     # Calculate attendance_count based on student Attendance
#     attendance_records = session.exec(
#         select(Attendance).where(
#             Attendance.student_id == db_admission.student_id)
#     ).all()
#     attendance_count = len(attendance_records)  # Get the count by using len()

#     del_student = session.exec(
#         select(Students).where(
#             Students.student_id == db_admission.student_id)
#     ).first()
#     session.delete(del_student)
#     session.commit()
#     # Create a new Termination record with the calculated total_stay and attendance_count
#     termination = Termination(
#         admission_id=admission_id,
#         total_stay=total_stay,
#         termination_reason=termination_reason,
#         termination_date=termination_date,
#         attendance_count=attendance_count
#     )

#     # Add the new termination record to the session and commit
#     session.add(termination)
#     session.commit()
#     session.refresh(termination)  # Refresh to get the generated termination_id

#     return termination


@adm_del_router.post("/termination/", response_model=TerminationResponse)
def terminate_student(
    user: Annotated[User, Depends(require_admin())],
    admission_id: int,
    termination_reason: str,
    session: Session = Depends(get_session)
):
    # Retrieve the Admission record based on the provided admission_id
    db_admission = session.get(Admission, admission_id)
    if not db_admission:
        raise HTTPException(
            status_code=404, detail="Admission record not found, please provide a correct Admission ID"
        )

    # Calculate total_stay in days based on admission_date and termination_date
    termination_date = datetime.now()
    total_stay = (termination_date - db_admission.admission_date).days

    # Calculate attendance_count based on student Attendance
    attendance_records = session.exec(
        select(Attendance).where(
            Attendance.student_id == db_admission.student_id)
    ).all()
    attendance_count = len(attendance_records)

    # Retrieve the student record
    del_student = session.get(Students, db_admission.student_id)
    if not del_student:
        raise HTTPException(
            status_code=404, detail="Student record not found, please provide a correct Admission ID"
        )

    # Create a DeletedStudents record
    deleted_student = DeletedStudents(
        student_id=del_student.student_id,
        student_name=del_student.student_name,
        student_date_of_birth=del_student.student_date_of_birth,
        student_gender=del_student.student_gender,
        student_age=del_student.student_age,
        student_education=del_student.student_education,
        student_class_name=del_student.student_class_name,
        student_city=del_student.student_city,
        student_address=del_student.student_address,
        father_name=del_student.father_name,
        father_occupation=del_student.father_occupation,
        father_cnic=del_student.father_cnic,
        father_cast_name=del_student.father_cast_name,
        father_contact=del_student.father_contact,
        deletion_date=termination_date,
        termination_reason=termination_reason,
        attendance_count=attendance_count,
        total_stay=total_stay
    )

    # Add the DeletedStudents record to the session
    session.add(deleted_student)

    # Delete the original student record
    session.delete(del_student)
    session.commit()

    # Create the Termination record with calculated total_stay and attendance_count
    termination = Termination(
        admission_id=admission_id,
        total_stay=total_stay,
        termination_reason=termination_reason,
        termination_date=termination_date,
        attendance_count=attendance_count
    )

    # Add the Termination record to the session and commit
    session.add(termination)
    session.commit()
    session.refresh(termination)  # Refresh to get the generated termination_id

    return termination
