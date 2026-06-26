from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Annotated
from datetime import datetime
from decimal import Decimal

from db import get_session
from schemas.students_model import DeletedStudent, DeletedStudentResponse, Students
from schemas.attendance_model import Attendance
from schemas.admission_model import Admission
from schemas.fee_model import Fee, FeeStatus
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
    try:
        # 1. Fetch the deleted record
        deleted = session.exec(
            select(DeletedStudent).where(DeletedStudent.student_id == deleted_student_id)
        ).first()
        if not deleted:
            raise HTTPException(status_code=404, detail="Deleted student record not found")

        # 2. Check for duplicate student_name + class_name in active students
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
        session.flush()
        session.refresh(restored_student)

        # 4. Reattach orphaned paid fees saved during delete
        if deleted.original_student_id is not None:
            orphaned_fees = session.exec(
                select(Fee).where(
                    Fee.original_student_id == deleted.original_student_id,
                    Fee.student_id.is_(None)
                )
            ).all()

            for fee in orphaned_fees:
                fee.student_id = restored_student.student_id
                fee.original_student_id = deleted.original_student_id
                session.add(fee)

        # 5. Restore unpaid fee records, if present in the deletion snapshot
        if deleted.fee_records:
            existing_fee_ids = {
                fee.fee_id
                for fee in session.exec(select(Fee.fee_id)).all()
            }

            for fee_data in deleted.fee_records:
                fee_status = str(fee_data.get("fee_status"))
                if fee_status == FeeStatus.UNPAID.value:
                    if fee_data.get("fee_id") in existing_fee_ids:
                        continue

                    restored_fee = Fee(
                        class_id=fee_data["class_id"],
                        fee_amount=Decimal(fee_data["fee_amount"]),
                        fee_month=fee_data["fee_month"],
                        fee_year=str(fee_data["fee_year"]),
                        fee_status=FeeStatus.UNPAID,
                        student_id=restored_student.student_id,
                        original_student_id=deleted.original_student_id,
                    )
                    session.add(restored_fee)

        # 6. Restore raw attendance rows from the deletion snapshot
        if deleted.attendance_records:
            for attendance_data in deleted.attendance_records:
                restored_attendance = Attendance(
                    attendance_date=(
                        datetime.fromisoformat(attendance_data["attendance_date"])
                        if isinstance(attendance_data["attendance_date"], str)
                        else attendance_data["attendance_date"]
                    ),
                    attendance_time_id=attendance_data.get("attendance_time_id"),
                    class_name_id=attendance_data.get("class_name_id"),
                    teacher_name_id=attendance_data.get("teacher_name_id"),
                    attendance_value_id=attendance_data.get("attendance_value_id"),
                    student_id=restored_student.student_id,
                )
                session.add(restored_attendance)

        # 7. Restore admission rows from the deletion snapshot
        if deleted.admission_records:
            for admission_data in deleted.admission_records:
                restored_admission = Admission(
                    admission_date=(
                        datetime.fromisoformat(admission_data["admission_date"])
                        if isinstance(admission_data["admission_date"], str)
                        else admission_data["admission_date"]
                    ),
                    required_class=admission_data.get("required_class"),
                    student_id=restored_student.student_id,
                )
                session.add(restored_admission)

        # 8. Remove deleted student audit record after full restore
        session.delete(deleted)
        session.commit()

        return {"message": f"Student '{deleted.student_name}' restored successfully."}
    except HTTPException:
        session.rollback()
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


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
