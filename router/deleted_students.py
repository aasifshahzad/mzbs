from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Annotated
from datetime import datetime

from db import get_session
from schemas.students_model import DeletedStudent, DeletedStudentResponse, Students
from user.user_crud import require_admin_principal, require_admin
from user.user_models import User

deleted_students_router = APIRouter(
    prefix="/deleted-students",
    tags=["Students"],
    responses={404: {"description": "Not found"}}
)


@deleted_students_router.get("/", response_model=List[DeletedStudentResponse])
def get_deleted_students(
    user: Annotated[User, Depends(require_admin_principal())],
    session: Annotated[Session, Depends(get_session)]
):
    """List all soft-deleted students. Accessible by admin/principal only."""
    records = session.exec(
        select(DeletedStudent).order_by(DeletedStudent.deleted_at.desc())
    ).all()
    return records


@deleted_students_router.post("/{deleted_student_id}/restore")
def restore_student(
    deleted_student_id: int,
    user: Annotated[User, Depends(require_admin_principal())],
    session: Annotated[Session, Depends(get_session)]
):
    """
    Restore a soft-deleted student back to the active students table.
    Integrity checks:
      - Class still exists
      - No duplicate roll_no conflict in active students
    """
    # 1. Fetch the deleted record
    deleted = session.exec(
        select(DeletedStudent).where(DeletedStudent.student_id == deleted_student_id)
    ).first()
    if not deleted:
        raise HTTPException(status_code=404, detail="Deleted student record not found")

    # 2. Check for duplicate student_name + class_name in active students
    # Using a combination since Students model uses student_name, not roll_no
    duplicate = session.exec(
        select(Students).where(
            (Students.student_name == deleted.student_name) &
            (Students.class_name == deleted.class_name)
        )
    ).first()
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"A student with name '{deleted.student_name}' already exists in class '{deleted.class_name}'."
        )

    # 3. Re-create the student in the active table
    restored_student = Students(
        student_name=deleted.student_name,
        student_date_of_birth=deleted.student_date_of_birth,
        student_gender=deleted.student_gender or "Not Specified",
        student_age=deleted.student_age or "0",
        student_education=deleted.student_education or "Not Specified",
        class_name=deleted.class_name,
        student_city=deleted.student_city or "Not Specified",
        student_address=deleted.student_address or "Not Specified",
        father_name=deleted.father_name or "Not Specified",
        father_occupation=deleted.father_occupation or "Not Specified",
        father_cnic=deleted.father_cnic or "Not Specified",
        father_cast_name=deleted.father_cast_name or "Not Specified",
        father_contact=deleted.father_contact or "Not Specified",
    )
    session.add(restored_student)

    # 4. Remove from deleted_students table
    session.delete(deleted)
    session.commit()

    return {"message": f"Student '{deleted.student_name}' restored successfully."}


@deleted_students_router.delete("/{deleted_student_id}/permanent")
def permanently_delete_student(
    deleted_student_id: int,
    user: Annotated[User, Depends(require_admin())],
    session: Annotated[Session, Depends(get_session)]
):
    """
    Permanently delete a soft-deleted student record from the deleted_students table.
    This is a hard delete - the record cannot be recovered.
    Admin only - Principals cannot perform this action.
    """
    # 1. Fetch the deleted record
    deleted = session.exec(
        select(DeletedStudent).where(DeletedStudent.student_id == deleted_student_id)
    ).first()
    if not deleted:
        raise HTTPException(status_code=404, detail="Deleted student record not found")

    student_name = deleted.student_name

    # 2. Permanently remove from deleted_students table
    session.delete(deleted)
    session.commit()

    return {"message": f"Student '{student_name}' permanently deleted. Record cannot be recovered."}
