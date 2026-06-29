from fastapi import APIRouter, Depends, HTTPException, Query
from router.class_names import read_classname
from schemas.class_names_model import ClassNames
from sqlmodel import Session, select
from sqlalchemy import func
from sqlalchemy.orm import joinedload
from typing import List, Optional
from typing import Annotated
from user.user_models import User, UserRole
from user.user_crud import get_current_user
from datetime import datetime

from db import get_session
from schemas.students_model import Students, StudentsCreate, StudentsResponse, StudentsUpdate, DeletedStudent, SoftDeleteRequest
from schemas.attendance_model import Attendance
from schemas.fee_model import Fee, FeeStatus
from schemas.admission_model import Admission
from user.user_crud import require_admin_principal
from user.user_models import User

students_router = APIRouter(
    prefix="/students",
    tags=["Students"],
    responses={404: {"description": "Not found"}}
)


@students_router.post("/add/", response_model=StudentsResponse)
def create_student(user: Annotated[User, Depends(require_admin_principal())],student: StudentsCreate, session: Annotated[Session, Depends(get_session)]):
    db_student = Students(**student.model_dump())
    session.add(db_student)

    try:
        session.commit()
        session.refresh(db_student)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    return db_student


@students_router.post("/add_bulk/", response_model=List[StudentsResponse])
def create_bulk_students(user: Annotated[User, Depends(require_admin_principal())],students: List[StudentsCreate], session: Annotated[Session, Depends(get_session)]):
    db_students = [Students(**student.model_dump()) for student in students]
    session.add_all(db_students)

    try:
        session.commit()
        for student in db_students:
            session.refresh(student)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    return db_students


@students_router.patch("/{student_id}", response_model=StudentsResponse)
def update_student(user: Annotated[User, Depends(require_admin_principal())],student_id: int, student: StudentsUpdate, session: Annotated[Session, Depends(get_session)]):
    db_student = session.exec(select(Students).where(
        Students.student_id == student_id)).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")

    student_dict_data = student.model_dump(exclude_unset=True)
    for key, value in student_dict_data.items():
        setattr(db_student, key, value)

    session.add(db_student)
    session.commit()
    session.refresh(db_student)

    return db_student


@students_router.delete("/{student_id}", response_model=dict)
def delete_student(
    user: Annotated[User, Depends(require_admin_principal())],
    student_id: int,
    payload: SoftDeleteRequest,
    session: Annotated[Session, Depends(get_session)]
):
    """
    Soft-delete a student:
    - Copies student data + deletion metadata into deleted_students table
    - Computes and stores attendance summary snapshot
    - Removes from active students table
    """
    try:
        # 1. Fetch active student
        db_student = session.exec(
            select(Students).where(Students.student_id == student_id)
        ).first()
        if not db_student:
            raise HTTPException(status_code=404, detail="Student not found")

        # ✅ 2. Compute attendance summary before anything is deleted
        attendance_records = session.exec(
            select(Attendance).where(Attendance.student_id == student_id)
        ).all()

        summary = {}
        for record in attendance_records:
            # Safely get the attendance value — use direct field access
            try:
                if record.attendance_value:
                    status = record.attendance_value.attendance_value
                else:
                    status = "Unknown"
            except Exception:
                status = "Unknown"
            summary[status] = summary.get(status, 0) + 1

        attendance_summary = {
            "total_records": len(attendance_records),
            "breakdown": summary,  # e.g. {"Present": 40, "Absent": 5, "Leave": 2}
            "snapshot_date": datetime.utcnow().isoformat()
        }

        attendance_records_snapshot = [
            {
                "attendance_date": record.attendance_date.isoformat(),
                "attendance_time_id": record.attendance_time_id,
                "class_name_id": record.class_name_id,
                "teacher_name_id": record.teacher_name_id,
                "attendance_value_id": record.attendance_value_id,
                "student_id": record.student_id,
            }
            for record in attendance_records
        ]

        admission_records = session.exec(
            select(Admission).where(Admission.student_id == student_id)
        ).all()
        admission_records_snapshot = [
            {
                "admission_date": record.admission_date.isoformat(),
                "required_class": record.required_class,
                "student_id": record.student_id,
            }
            for record in admission_records
        ]

        # ✅ 2.5. Snapshot paid fees (before deleting unpaid fees)
        all_fees = session.exec(
            select(Fee).where(Fee.student_id == student_id)
        ).all()

        fee_records_snapshot = [
            {
                "fee_id": f.fee_id,
                "class_id": f.class_id,
                "fee_amount": str(f.fee_amount),
                "fee_month": f.fee_month,
                "fee_year": str(f.fee_year),
                "fee_status": f.fee_status,
                "student_id": f.student_id,
                "original_student_id": f.original_student_id,
            }
            for f in all_fees
        ]

        paid_fees_snapshot = [
            {
                "fee_id": f.fee_id,
                "fee_month": f.fee_month,
                "fee_year": str(f.fee_year),
                "fee_amount": str(f.fee_amount),
                "fee_status": f.fee_status,
            }
            for f in all_fees if f.fee_status == FeeStatus.PAID
        ]

        fee_summary = {
            "total_fees": len(all_fees),
            "paid_count": len(paid_fees_snapshot),
            "unpaid_count": len([f for f in all_fees if f.fee_status == FeeStatus.UNPAID]),
            "paid_records": paid_fees_snapshot,
            "snapshot_date": datetime.utcnow().isoformat()
        }

        # 3. Archive to deleted_students (with summary)
        deleted_record = DeletedStudent(
            original_student_id=db_student.student_id,
            student_name=db_student.student_name,
            student_date_of_birth=db_student.student_date_of_birth,
            student_gender=db_student.student_gender,
            student_age=db_student.student_age,
            student_education=db_student.student_education,
            class_name=db_student.class_name,
            student_city=db_student.student_city,
            student_address=db_student.student_address,
            father_name=db_student.father_name,
            father_occupation=db_student.father_occupation,
            father_cnic=db_student.father_cnic,
            father_cast_name=db_student.father_cast_name,
            father_contact=db_student.father_contact,
            reason=payload.reason,
            deleted_by=payload.deleted_by,
            deleted_at=datetime.utcnow(),
            attendance_summary=attendance_summary,  # ✅
            attendance_records=attendance_records_snapshot,
            admission_records=admission_records_snapshot,
            fee_summary=fee_summary,  # ✅ NEW
            fee_records=fee_records_snapshot,
        )
        session.add(deleted_record)

        # 4. Stamp original_student_id on ALL fee rows before cascade
        # (we already captured `all_fees` earlier for the fee snapshot)
        for f in all_fees:
            f.original_student_id = student_id
            session.add(f)

        # 5. Delete UNPAID fees only
        for f in all_fees:
            if f.fee_status == FeeStatus.UNPAID:
                session.delete(f)

        # 6. Delete attendance records
        for record in attendance_records:
            session.delete(record)

        # Delete admission records
        admission_records = session.exec(
            select(Admission).where(Admission.student_id == student_id)
        ).all()
        for record in admission_records:
            session.delete(record)

        # 7. Delete student (paid fees auto-set student_id = NULL via ON DELETE SET NULL)
        session.delete(db_student)
        session.commit()

        return {"message": f"Student '{db_student.student_name}' soft-deleted successfully."}
    except HTTPException:
        session.rollback()
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@students_router.get("/all_students/", response_model=dict)
def all_students(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    page: int = Query(10, ge=1, le=50, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, description="Records per page"),
):
    if current_user.role == UserRole.USER:
        raise HTTPException(
            status_code=403,
            detail="Only teachers and administrators can view student records"
        )
    total = session.exec(select(func.count(Students.student_id))).one()
    students = session.exec(
        select(Students)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {
        "data": students,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@students_router.get("/by_class_name/", response_model=List[StudentsResponse])
def get_students_by_class(
    current_user: Annotated[User, Depends(get_current_user)],
    class_name: str, 
    session: Annotated[Session, Depends(get_session)]
):
    if current_user.role == UserRole.USER:
        raise HTTPException(
            status_code=403,
            detail="Only teachers and administrators can view student records"
        )
    query = select(Students).where(Students.class_name == class_name)
    students = session.exec(query).all()
    if not students:
        raise HTTPException(
            status_code=404, 
            detail="No students found for the specified class"
        )
    return students


@students_router.get("/by_class_id/", response_model=List[StudentsResponse])
def get_students_by_class_id(
    current_user: Annotated[User, Depends(get_current_user)],
    class_id: int, 
    session: Annotated[Session, Depends(get_session)]
):
    try:
        # Check user authorization
        if current_user.role == UserRole.USER:
            raise HTTPException(
                status_code=403,
                detail="Only teachers and administrators can view student records"
            )
        
        # Validate class_id
        if class_id <= 0:
            raise HTTPException(
                status_code=400,
                detail="Invalid class ID"
            )
        
        # Get class name from class_id using class_name_id from ClassNames model
        class_name_obj = session.exec(
            select(ClassNames).where(ClassNames.class_name_id == class_id)
        ).first()
        
        if not class_name_obj:
            raise HTTPException(
                status_code=404, 
                detail=f"Class with ID {class_id} not found"
            )
        
        # Query students by class name
        students = session.exec(
            select(Students).where(Students.class_name == class_name_obj.class_name)
        ).all()
        
        if not students:
            raise HTTPException(
                status_code=404, 
                detail=f"No students found for class {class_name_obj.class_name}"
            )
            
        return students
        
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving students: {str(e)}"
        )


@students_router.get("/by_gender", response_model=List[StudentsResponse])
def get_student_by_gender(
    current_user: Annotated[User, Depends(get_current_user)],
    gender: str, 
    session: Annotated[Session, Depends(get_session)]
):
    if current_user.role == UserRole.USER:
        raise HTTPException(
            status_code=403,
            detail="Only teachers and administrators can view student records"
        )
    query = select(Students).where(Students.student_gender == gender)
    student = session.exec(query).all()
    if not student:
        raise HTTPException(
            status_code=404, 
            detail="No Student found of this gender"
        )
    return student


@students_router.get("/by_city", response_model=List[StudentsResponse])
def get_student_by_city(
    current_user: Annotated[User, Depends(get_current_user)],
    city: str, 
    session: Annotated[Session, Depends(get_session)]
):
    if current_user.role == UserRole.USER:
        raise HTTPException(
            status_code=403,
            detail="Only teachers and administrators can view student records"
        )
    query = select(Students).where(Students.student_city == city)
    student = session.exec(query).all()
    if not student:
        raise HTTPException(
            status_code=404, 
            detail="No Student found of this City"
        )
    return student


@students_router.get("/filter", response_model=List[StudentsResponse])
def filter_students(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    class_name: Optional[str] = Query(None, description="Filter by class name"),
    gender: Optional[str] = Query(None, description="Filter by gender"),
    city: Optional[str] = Query(None, description="Filter by city"),
):
    if current_user.role == UserRole.USER:
        raise HTTPException(
            status_code=403,
            detail="Only teachers and administrators can view student records"
        )
    query = select(Students)

    if class_name:
        query = query.where(Students.class_name == class_name)
    if gender:
        query = query.where(Students.student_gender == gender)
    if city:
        query = query.where(Students.student_city == city)

    students = session.exec(query).all()
    if not students:
        raise HTTPException(
            status_code=404, 
            detail="No students found matching the criteria"
        )
    return students


async def get_student_by_id(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    student_id: int
) -> Students | None:
    """Get a student by their ID."""
    return session.exec(select(Students).where(Students.student_id == student_id)).first()


def get_student_details_utility(session: Session, student_id: int) -> Optional[dict]:
    """Utility function to fetch student details by student_id (for internal use)."""
    student = session.exec(select(Students).where(Students.student_id == student_id)).first()
    if student:
        return {
            "student_name": student.student_name,
            "father_name": student.father_name
        }
    return None


def get_student_details(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    student_id: int
) -> Optional[dict]:
    """Fetch student details by student_id."""
    student = session.exec(select(Students).where(Students.student_id == student_id)).first()
    if student:
        return {
            "student_name": student.student_name,
            "father_name": student.father_name
        }
    return None
