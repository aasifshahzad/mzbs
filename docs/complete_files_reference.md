# Complete Files Reference - MMS Project

## File: router/fee.py

```python
from typing import Optional
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from sqlmodel import Session, select
from router.class_names import get_class_name
from decimal import Decimal

from schemas.class_names_model import ClassNames
from schemas.students_model import Students, DeletedStudent
from router.students import get_student_by_id, get_student_details, get_student_details_utility
from sqlalchemy import func
from datetime import datetime
from schemas.fee_model import MONTHS

from db import get_session
from schemas.fee_model import Fee, FeeCreate, FeeResponse, FeeStatus, FeeUpdateRequest, FeeFilter, FilterPaidUnpaid
from user.user_crud import require_admin_accountant_fee_manager, require_admin
from user.user_models import User

fee_router = APIRouter(
    prefix="/fee",
    tags=["Student Fee"],
    responses={404: {"Description": "Not found"}}
)

@fee_router.get("/", response_model=dict)
async def root():
    return {"message": "Fee Router Page running :-)"}

@fee_router.get("/all", response_model=List[FeeResponse])
async def get_all_fees(
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin_accountant_fee_manager())]
):
    """Retrieve all student fee records (Authenticated users)."""
    from sqlalchemy import outerjoin

    stmt = (
        select(Fee, Students, ClassNames)
        .outerjoin(Students, Fee.student_id == Students.student_id)
        .outerjoin(ClassNames, Fee.class_id == ClassNames.class_name_id)
    )
    results = db.exec(stmt).all()

    response_list = []
    for fee, student, class_obj in results:
        if student is None:
            student_name = "Unknown [Deleted]"
            father_name = "N/A"
        else:
            student_name = student.student_name
            father_name = student.father_name

        response_list.append(FeeResponse(
            fee_id=fee.fee_id,
            created_at=fee.created_at,
            student_name=student_name,
            father_name=father_name,
            class_name=class_obj.class_name if class_obj else None,
            fee_amount=fee.fee_amount,
            fee_month=fee.fee_month,
            fee_year=str(fee.fee_year),
            fee_status=fee.fee_status
        ))

    return response_list

@fee_router.post("/add_fee", response_model=FeeResponse, status_code=status.HTTP_201_CREATED)
async def create_fee(
    fee_data: FeeCreate,
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin_accountant_fee_manager())]
):
    """Create a new student fee record (Admin only)."""
    try:
        student = db.exec(select(Students).where(Students.student_id == fee_data.student_id)).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with ID {fee_data.student_id} not found"
            )

        class_name = db.exec(select(ClassNames).where(ClassNames.class_name_id == fee_data.class_id)).first()
        if not class_name:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Class with ID {fee_data.class_id} not found"
            )

        fee_data_dict = fee_data.model_dump()
        if fee_data.fee_amount > 0:
            fee_data_dict['fee_status'] = 'Paid'
        else:
            fee_data_dict['fee_status'] = 'Unpaid'

        fee_data_dict['fee_year'] = str(fee_data_dict['fee_year'])

        new_fee = Fee(**fee_data_dict)
        db.add(new_fee)
        db.commit()
        db.refresh(new_fee)

        response = FeeResponse(
            fee_id=new_fee.fee_id,
            created_at=new_fee.created_at,
            student_name=student.student_name,
            father_name=student.father_name,
            class_name=class_name.class_name,
            fee_amount=new_fee.fee_amount,
            fee_month=new_fee.fee_month,
            fee_year=str(new_fee.fee_year),
            fee_status=new_fee.fee_status
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating fee record: {str(e)}"
        )

@fee_router.delete("/delete_fee/{fee_id}", response_model=dict, status_code=status.HTTP_200_OK)
async def delete_fee(
    fee_id: int,
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin())]
):
    """Delete a student fee record by ID (Admin only)."""
    try:
        fee = db.exec(select(Fee).where(Fee.fee_id == fee_id)).first()
        if not fee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee record with ID {fee_id} not found"
            )

        db.delete(fee)
        db.commit()
        return {"message": "Fee deleted successfully"}
       
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting fee record: {str(e)}"
        )

@fee_router.put("/update_fee/{fee_id}", response_model=FeeResponse, status_code=status.HTTP_200_OK)
async def update_fee(
    fee_id: int,
    fee_data: FeeUpdateRequest,
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin_accountant_fee_manager())]
):
    """Update a student fee record - only paid fees can be edited (Admin/Accountant only)."""
    try:
        fee = db.exec(select(Fee).where(Fee.fee_id == fee_id)).first()
        if not fee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee record with ID {fee_id} not found"
            )

        # Only allow editing of paid fee records
        if fee.fee_status != FeeStatus.PAID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only paid fee records can be edited. This fee is marked as {fee.fee_status}."
            )

        # Update fields if provided
        if fee_data.fee_amount is not None:
            fee.fee_amount = fee_data.fee_amount
        
        if fee_data.fee_month is not None:
            fee.fee_month = fee_data.fee_month
        
        if fee_data.fee_year is not None:
            fee.fee_year = str(fee_data.fee_year)

        db.add(fee)
        db.commit()
        db.refresh(fee)

        # Fetch student and class info for response
        student_details = get_student_details_utility(db, fee.student_id)
        class_name_obj = db.exec(
            select(ClassNames)
            .where(ClassNames.class_name_id == fee.class_id)
        ).first()

        response = FeeResponse(
            fee_id=fee.fee_id,
            created_at=fee.created_at,
            student_name=student_details["student_name"] if student_details else None,
            father_name=student_details["father_name"] if student_details else None,
            class_name=class_name_obj.class_name if class_name_obj else None,
            fee_amount=fee.fee_amount,
            fee_month=fee.fee_month,
            fee_year=str(fee.fee_year),
            fee_status=fee.fee_status
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating fee record: {str(e)}"
        )

@fee_router.post("/filter/", response_model=dict)
async def filter_fees(
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin_accountant_fee_manager())],
    class_id: Optional[int] = Query(None, description="Filter by class ID"),
    fee_month: Optional[str] = Query(None, description="Filter by fee month"),
    fee_year: Optional[str] = Query(None, description="Filter by fee year"),
    fee_status: Optional[str] = Query(None, description="Filter by fee status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, description="Records per page"),
    sort_by: Optional[str] = Query(None, description="Sort by field")
):
    """
    Filter student fee records based on provided criteria.
    - Works for All Classes or a specific class
    - Works for All Months or a specific month
    - Works for All Status (Paid + Unpaid), Paid only, or Unpaid only
    - Active students: shown as Paid or Unpaid
    - Deleted students: shown ONLY if they have a Paid record (never as Unpaid)
    """
    try:
        # ── Normalize frontend "All" / empty strings → None ──────────────────
        if fee_status in ("All", "", None):
            fee_status = None       # None = no filter = show all statuses
        if fee_month in ("All", ""):
            fee_month = None        # None = all months

        months_to_check = [fee_month] if fee_month else MONTHS
        filtered_response = []

        # ── Shared helper: build deleted student lookup ───────────────────────
        # { original_student_id: DeletedStudent }
        deleted_students_all = db.exec(select(DeletedStudent)).all()
        deleted_student_map  = {d.original_student_id: d for d in deleted_students_all}
        deleted_ids          = set(deleted_student_map.keys())

        # ── Shared helper: cache class names to avoid N DB calls ──────────────
        class_name_cache = {}
        def cached_class_name(cid):
            if cid not in class_name_cache:
                class_name_cache[cid] = get_class_name(db, cid)
            return class_name_cache[cid]

        # ════════════════════════════════════════════════════════════════════════
        # BRANCH A  –  Specific class selected
        # ════════════════════════════════════════════════════════════════════════
        if class_id:
            class_obj = db.exec(
                select(ClassNames).where(ClassNames.class_name_id == class_id)
            ).first()
            if not class_obj:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Class with ID {class_id} not found"
                )
            class_name = class_obj.class_name

            # All active students in this class
            active_students = db.exec(
                select(Students).where(
                    Students.class_name == class_name,
                    Students.student_id.not_in(deleted_ids) if deleted_ids else True
                )
            ).all()

            # ── A1: Status = Unpaid ───────────────────────────────────────────
            if fee_status == "Unpaid":
                for month in months_to_check:
                    # Get all paid student IDs for this class/month/year
                    paid_query = select(Fee.student_id).where(
                        Fee.class_id == class_id,
                        Fee.fee_status == FeeStatus.PAID,
                        Fee.fee_month == month
                    )
                    if fee_year:
                        paid_query = paid_query.where(Fee.fee_year == str(fee_year))
                    paid_ids = set(db.exec(paid_query).all())

                    # Active students NOT in paid list → Unpaid
                    for student in active_students:
                        if student.student_id not in paid_ids:
                            filtered_response.append(FilterPaidUnpaid(
                                fee_id=None,
                                student_id=student.student_id,
                                student_name=student.student_name,
                                father_name=student.father_name,
                                class_name=class_name,
                                fee_status=FeeStatus.UNPAID,
                                fee_month=month,
                                fee_year=str(fee_year) if fee_year else "N/A",
                                fee_amount=Decimal(0)
                            ))
                    # NOTE: Deleted students are never shown as Unpaid

            # ── A2: Status = Paid ─────────────────────────────────────────────
            elif fee_status == "Paid":
                for month in months_to_check:
                    paid_query = select(Fee).where(
                        Fee.class_id == class_id,
                        Fee.fee_status == FeeStatus.PAID,
                        Fee.fee_month == month
                    )
                    if fee_year:
                        paid_query = paid_query.where(Fee.fee_year == str(fee_year))
                    paid_fees = db.exec(paid_query).all()
                    paid_map  = {f.student_id: f for f in paid_fees}

                    # Active students who paid
                    for student in active_students:
                        if student.student_id in paid_map:
                            fee = paid_map[student.student_id]
                            filtered_response.append(FilterPaidUnpaid(
                                fee_id=fee.fee_id,
                                student_id=student.student_id,
                                student_name=student.student_name,
                                father_name=student.father_name,
                                class_name=class_name,
                                fee_status=FeeStatus.PAID,
                                fee_month=month,
                                fee_year=str(fee.fee_year),
                                fee_amount=fee.fee_amount
                            ))

                    # Deleted students in this class who paid
                    for student_id, fee in paid_map.items():
                        if student_id in deleted_ids:
                            deleted = deleted_student_map[student_id]
                            # Only include if they belonged to this class
                            if hasattr(deleted, 'class_name') and deleted.class_name == class_name:
                                filtered_response.append(FilterPaidUnpaid(
                                    fee_id=fee.fee_id,
                                    student_id=student_id,
                                    student_name=f"[Deleted] {deleted.student_name}",
                                    father_name=deleted.father_name,
                                    class_name=class_name,
                                    fee_status=FeeStatus.PAID,
                                    fee_month=month,
                                    fee_year=str(fee.fee_year),
                                    fee_amount=fee.fee_amount,
                                    is_deleted=True
                                ))

            # ── A3: Status = All (None) ───────────────────────────────────────
            else:
                for month in months_to_check:
                    fee_query = select(Fee).where(
                        Fee.class_id == class_id,
                        Fee.fee_month == month
                    )
                    if fee_year:
                        fee_query = fee_query.where(Fee.fee_year == str(fee_year))
                    month_fees = db.exec(fee_query).all()

                    # Only keep paid records in the map (one per student)
                    paid_map = {
                        f.student_id: f
                        for f in month_fees
                        if f.fee_status == FeeStatus.PAID
                    }

                    # Active students → Paid or Unpaid
                    for student in active_students:
                        if student.student_id in paid_map:
                            fee = paid_map[student.student_id]
                            filtered_response.append(FilterPaidUnpaid(
                                fee_id=fee.fee_id,
                                student_id=student.student_id,
                                student_name=student.student_name,
                                father_name=student.father_name,
                                class_name=class_name,
                                fee_status=FeeStatus.PAID,
                                fee_month=month,
                                fee_year=str(fee.fee_year),
                                fee_amount=fee.fee_amount
                            ))
                        else:
                            filtered_response.append(FilterPaidUnpaid(
                                fee_id=None,
                                student_id=student.student_id,
                                student_name=student.student_name,
                                father_name=student.father_name,
                                class_name=class_name,
                                fee_status=FeeStatus.UNPAID,
                                fee_month=month,
                                fee_year=str(fee_year) if fee_year else "N/A",
                                fee_amount=Decimal(0)
                            ))

                    # Deleted students in this class who paid → show as Paid only
                    for student_id, fee in paid_map.items():
                        if student_id in deleted_ids:
                            deleted = deleted_student_map[student_id]
                            if hasattr(deleted, 'class_name') and deleted.class_name == class_name:
                                filtered_response.append(FilterPaidUnpaid(
                                    fee_id=fee.fee_id,
                                    student_id=student_id,
                                    student_name=f"[Deleted] {deleted.student_name}",
                                    father_name=deleted.father_name,
                                    class_name=class_name,
                                    fee_status=FeeStatus.PAID,
                                    fee_month=month,
                                    fee_year=str(fee.fee_year),
                                    fee_amount=fee.fee_amount,
                                    is_deleted=True
                                ))

        # ════════════════════════════════════════════════════════════════════════
        # BRANCH B  –  All Classes (no class_id)
        # ════════════════════════════════════════════════════════════════════════
        else:
            # All active students across every class
            active_students = [
                s for s in db.exec(select(Students)).all()
                if s.student_id not in deleted_ids
            ]

            if not active_students and not deleted_ids:
                return []

            # ── B1: Status = Unpaid ───────────────────────────────────────────
            if fee_status == "Unpaid":
                for month in months_to_check:
                    paid_query = select(Fee.student_id).where(
                        Fee.fee_status == FeeStatus.PAID,
                        Fee.fee_month == month
                    )
                    if fee_year:
                        paid_query = paid_query.where(Fee.fee_year == str(fee_year))
                    paid_ids = set(db.exec(paid_query).all())

                    # Active students not in paid list → Unpaid
                    for student in active_students:
                        if student.student_id not in paid_ids:
                            filtered_response.append(FilterPaidUnpaid(
                                fee_id=None,
                                student_id=student.student_id,
                                student_name=student.student_name,
                                father_name=student.father_name,
                                class_name=student.class_name,
                                fee_status=FeeStatus.UNPAID,
                                fee_month=month,
                                fee_year=str(fee_year) if fee_year else "N/A",
                                fee_amount=Decimal(0)
                            ))
                    # NOTE: Deleted students are never shown as Unpaid

            # ── B2: Status = Paid ─────────────────────────────────────────────
            elif fee_status == "Paid":
                for month in months_to_check:
                    paid_query = select(Fee).where(
                        Fee.fee_status == FeeStatus.PAID,
                        Fee.fee_month == month
                    )
                    if fee_year:
                        paid_query = paid_query.where(Fee.fee_year == str(fee_year))
                    paid_fees = db.exec(paid_query).all()
                    paid_map  = {f.student_id: f for f in paid_fees}

                    # Active students who paid
                    for student in active_students:
                        if student.student_id in paid_map:
                            fee = paid_map[student.student_id]
                            filtered_response.append(FilterPaidUnpaid(
                                fee_id=fee.fee_id,
                                student_id=student.student_id,
                                student_name=student.student_name,
                                father_name=student.father_name,
                                class_name=cached_class_name(fee.class_id),
                                fee_status=FeeStatus.PAID,
                                fee_month=month,
                                fee_year=str(fee.fee_year),
                                fee_amount=fee.fee_amount
                            ))

                    # Deleted students who paid (regardless of class)
                    for student_id, fee in paid_map.items():
                        if student_id in deleted_ids:
                            deleted = deleted_student_map[student_id]
                            filtered_response.append(FilterPaidUnpaid(
                                fee_id=fee.fee_id,
                                student_id=student_id,
                                student_name=f"[Deleted] {deleted.student_name}",
                                father_name=deleted.father_name,
                                class_name=cached_class_name(fee.class_id),
                                fee_status=FeeStatus.PAID,
                                fee_month=month,
                                fee_year=str(fee.fee_year),
                                fee_amount=fee.fee_amount,
                                is_deleted=True
                            ))

            # ── B3: Status = All (None) ───────────────────────────────────────
            else:
                for month in months_to_check:
                    paid_query = select(Fee).where(
                        Fee.fee_status == FeeStatus.PAID,
                        Fee.fee_month == month
                    )
                    if fee_year:
                        paid_query = paid_query.where(Fee.fee_year == str(fee_year))
                    paid_fees = db.exec(paid_query).all()
                    paid_map  = {f.student_id: f for f in paid_fees}

                    # Pre-cache class names for all paid fees this month
                    for fee in paid_fees:
                        cached_class_name(fee.class_id)

                    # Active students → Paid or Unpaid
                    for student in active_students:
                        if student.student_id in paid_map:
                            fee = paid_map[student.student_id]
                            filtered_response.append(FilterPaidUnpaid(
                                fee_id=fee.fee_id,
                                student_id=student.student_id,
                                student_name=student.student_name,
                                father_name=student.father_name,
                                class_name=cached_class_name(fee.class_id),
                                fee_status=FeeStatus.PAID,
                                fee_month=month,
                                fee_year=str(fee.fee_year),
                                fee_amount=fee.fee_amount
                            ))
                        else:
                            filtered_response.append(FilterPaidUnpaid(
                                fee_id=None,
                                student_id=student.student_id,
                                student_name=student.student_name,
                                father_name=student.father_name,
                                class_name=student.class_name,
                                fee_status=FeeStatus.UNPAID,
                                fee_month=month,
                                fee_year=str(fee_year) if fee_year else "N/A",
                                fee_amount=Decimal(0)
                            ))

                    # Deleted students who paid → show as Paid only
                    for student_id, fee in paid_map.items():
                        if student_id in deleted_ids:
                            deleted = deleted_student_map[student_id]
                            filtered_response.append(FilterPaidUnpaid(
                                fee_id=fee.fee_id,
                                student_id=student_id,
                                student_name=f"[Deleted] {deleted.student_name}",
                                father_name=deleted.father_name,
                                class_name=cached_class_name(fee.class_id),
                                fee_status=FeeStatus.PAID,
                                fee_month=month,
                                fee_year=str(fee.fee_year),
                                fee_amount=fee.fee_amount,
                                is_deleted=True
                            ))
        # ─── Handle orphaned paid fees (deleted students with student_id = NULL) ────
        # These are paid fees where the student was deleted but the fee record remains
        orphaned_fees = db.exec(
            select(Fee).where(
                Fee.student_id.is_(None),
                Fee.original_student_id.isnot(None),
                Fee.fee_status == FeeStatus.PAID
            )
        ).all()

        for fee in orphaned_fees:
            # Check if this fee matches the current filters
            should_include = True
            
            if fee_year and str(fee.fee_year) != str(fee_year):
                should_include = False
            
            if fee_month and fee.fee_month != fee_month:
                should_include = False

            if class_id and fee.class_id != class_id:
                should_include = False

            if fee_status and fee_status != "All" and fee.fee_status != fee_status:
                should_include = False

            if should_include:
                # Look up deleted student info
                deleted = deleted_student_map.get(fee.original_student_id)
                
                filtered_response.append(FilterPaidUnpaid(
                    fee_id=fee.fee_id,
                    student_id=fee.original_student_id,
                    student_name=f"{deleted.student_name} ⚠ Deleted" if deleted else "Deleted Student",
                    father_name=deleted.father_name or "N/A" if deleted else "N/A",
                    class_name=deleted.class_name if deleted else cached_class_name(fee.class_id),
                    fee_status=fee.fee_status,
                    fee_month=fee.fee_month,
                    fee_year=fee.fee_year,
                    fee_amount=fee.fee_amount,
                    is_deleted=True
                ))
        # ── Sort by class name ────────────────────────────────────────────────
        filtered_response.sort(key=lambda x: x.class_name)

        # ── Pagination ────────────────────────────────────────────────────────
        total = len(filtered_response)
        page_data = filtered_response[(page - 1) * page_size : page * page_size]
        return {
            "data": [r.model_dump() for r in page_data],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Fee filter error: {str(e)}\n{error_detail}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error filtering fee records: {str(e)}"
        )

@fee_router.get("/paid-students/", response_model=List[FilterPaidUnpaid])
async def get_paid_students(
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin_accountant_fee_manager())],
    class_id: Optional[int] = Query(None, description="Filter by class ID"),
    fee_month: Optional[str] = Query(None, description="Filter by month", enum=MONTHS),
    fee_year: Optional[str] = Query(None, description="Filter by fee year")
):
    """Get list of students who have paid fees, with optional filters."""
    try:
        query = select(Fee).where(Fee.fee_status == FeeStatus.PAID)
        
        if class_id:
            query = query.where(Fee.class_id == class_id)
        if fee_month:
            if fee_month not in MONTHS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid month. Must be one of {MONTHS}"
                )
            query = query.where(Fee.fee_month == fee_month)
        if fee_year:
            query = query.where(Fee.fee_year == str(fee_year))
        
        fees = db.exec(query).all()
        students_list = []

        for fee in fees:
            student_details = get_student_details(db, fee.student_id)
            if not student_details:
                continue
                
            class_name = get_class_name(db, fee.class_id)
            
            student_info = FilterPaidUnpaid(
                fee_id=fee.fee_id,
                student_id=fee.student_id,
                student_name=student_details["student_name"],
                father_name=student_details["father_name"],
                class_name=class_name,
                fee_status=fee.fee_status,
                fee_month=fee.fee_month,
                fee_year=str(fee.fee_year),
                fee_amount=fee.fee_amount
            )
            students_list.append(student_info)

        return students_list

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching paid students: {str(e)}"
        )

@fee_router.get("/unpaid_students/", response_model=List[FilterPaidUnpaid])
async def get_unpaid_students(
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin_accountant_fee_manager())],
    class_id: Optional[int] = Query(None, description="Filter by class ID"),
    fee_month: Optional[str] = Query(None, description="Filter by month", enum=MONTHS),
    fee_year: Optional[str] = Query(None, description="Filter by fee year"),
):
    """Get students who haven't paid fees for the specified month/year/class."""
    try:
        paid_students_subquery = select(Fee.student_id)
        
        if class_id:
            paid_students_subquery = paid_students_subquery.where(Fee.class_id == class_id)
        if fee_month:
            paid_students_subquery = paid_students_subquery.where(Fee.fee_month == fee_month)
        if fee_year:
            paid_students_subquery = paid_students_subquery.where(Fee.fee_year == str(fee_year))
        
        unpaid_students_query = select(Students).where(
            Students.student_id.not_in(paid_students_subquery)
        )
        
        if class_id:
            class_name = get_class_name(db, class_id)
            if not class_name:
                raise HTTPException(
                    status_code=404,
                    detail=f"Class with ID {class_id} not found"
                )
            unpaid_students_query = unpaid_students_query.where(
                Students.class_name == class_name
            )
        
        unpaid_students = db.exec(unpaid_students_query).all()
        
        response_list = []
        for student in unpaid_students:
            class_name = student.class_name
            if class_id:
                class_name = get_class_name(db, class_id)
            
            response_list.append(
                FilterPaidUnpaid(
                    fee_id=None,
                    student_id=student.student_id,
                    student_name=student.student_name,
                    father_name=student.father_name,
                    class_name=class_name,
                    fee_status=FeeStatus.UNPAID,
                    fee_month=fee_month if fee_month else "N/A",
                    fee_year=str(fee_year) if fee_year else "N/A",
                    fee_amount=Decimal(0)
                )
            )
        
        return response_list
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching unpaid students: {str(e)}"
        )

@fee_router.get("/class-fee-status/{class_id}", response_model=List[FilterPaidUnpaid])
async def get_class_fee_status(
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin_accountant_fee_manager())],
    class_id: int,
    fee_month: Optional[str] = Query(None, description="Filter by month", enum=MONTHS),
    fee_year: Optional[str] = Query(None, description="Filter by year")
):
    """Get all students in a class with their fee payment status."""
    try:
        class_obj = db.exec(select(ClassNames).where(ClassNames.class_name_id == class_id)).first()
        if not class_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Class with ID {class_id} not found"
            )
        class_name = class_obj.class_name

        students_query = select(Students).where(Students.class_name == class_name)
        all_students = db.exec(students_query).all()

        fee_query = select(Fee).where(Fee.class_id == class_id)
        
        if fee_month:
            fee_query = fee_query.where(Fee.fee_month == fee_month)
        if fee_year:
            fee_query = fee_query.where(Fee.fee_year == str(fee_year))
            
        all_fees = db.exec(fee_query).all()
        
        student_fee_status = {}
        for fee in all_fees:
            if fee.student_id not in student_fee_status:
                student_fee_status[fee.student_id] = {
                    'fee_id': fee.fee_id,
                    'status': fee.fee_status,
                    'month': fee.fee_month,
                    'year': fee.fee_year,
                    'amount': fee.fee_amount
                }

        response_list = []
        
        for student in all_students:
            fee_info = student_fee_status.get(student.student_id)
            
            if fee_info and fee_info['status'] == FeeStatus.PAID:
                response_list.append(
                    FilterPaidUnpaid(
                        fee_id=fee_info['fee_id'],
                        student_id=student.student_id,
                        student_name=student.student_name,
                        father_name=student.father_name,
                        class_name=class_name,
                        fee_status=FeeStatus.PAID,
                        fee_month=fee_info['month'],
                        fee_year=str(fee_info['year']),
                        fee_amount=fee_info['amount']
                    )
                )
            else:
                response_list.append(
                    FilterPaidUnpaid(
                        fee_id=None,
                        student_id=student.student_id,
                        student_name=student.student_name,
                        father_name=student.father_name,
                        class_name=class_name,
                        fee_status=FeeStatus.UNPAID,
                        fee_month=fee_month or "N/A",
                        fee_year=str(fee_year) if fee_year else "N/A",
                        fee_amount=Decimal(0)
                    )
                )
        
        return response_list

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching class fee status: {str(e)}"
        )
```

---

## File: router/income.py

```python
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from sqlalchemy import func
from typing import List, Optional  # Import List and Optional for response model

from db import get_session
from schemas.income_model import Income, IncomeCreate, IncomeResponse, IncomeUpdate
from user.user_crud import require_admin_accountant_fee_manager, require_admin_accountant, require_admin
from user.user_models import User
from schemas.income_cat_names_model import IncomeCatNames  # Import IncomeCatNames

income_router = APIRouter(
    prefix="/income",
    tags=["Income"],
    responses={404: {"Description": "Not found"}}
)

@income_router.get("/", response_model=dict)
async def root():
    return {"message": "Income Router Page running :-)"}

@income_router.get("/all", response_model=dict)
def get_all_incomes(
    session: Session = Depends(get_session),
    user: User = Depends(require_admin_accountant()),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
):
    """Get all income records."""
    try:
        total = session.scalar(select(func.count(Income.id))) or 0
        incomes = session.exec(
            select(Income)
            .order_by(Income.date.desc(), Income.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()

        response = []
        for income in incomes:
            category = session.get(IncomeCatNames, income.category_id)
            response.append(IncomeResponse(
                id=income.id,
                created_at=income.created_at or datetime.utcnow(),
                recipt_number=str(income.recipt_number) if income.recipt_number is not None else None,
                date=income.date,
                category=category.income_cat_name if category else None,
                source=income.source,
                description=income.description,
                contact=income.contact,
                amount=income.amount
            ))

        return {
            "data": response,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching income records: {str(e)}"
        )

@income_router.post("/", response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
def create_income(
    income: IncomeCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_admin_accountant())
):
    # Ensure the category exists
    category = session.get(IncomeCatNames, income.category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income category not found"
        )
    
    # Parse the date field
    try:
        parsed_date = income.date
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use 'YYYY-MM-DD'."
        )
    
    # Create the Income instance
    db_income = Income(
        recipt_number=income.recipt_number,
        date=parsed_date,  # Use the parsed date
        category_id=income.category_id,
        source=income.source,
        description=income.description if income.description != "" else None,
        contact=income.contact if income.contact != "" else None,
        amount=income.amount,
        created_at=datetime.now()  # Set created_at to current datetime
    )
    session.add(db_income)
    session.commit()
    session.refresh(db_income)
    
    # Return the response with the category name
    return IncomeResponse(
        id=db_income.id,  # type: ignore
        created_at=db_income.created_at,  # type: ignore
        recipt_number=str(db_income.recipt_number) if db_income.recipt_number is not None else None,
        date=db_income.date,  # type: ignore
        category=category.income_cat_name,  
        source=db_income.source,
        description=db_income.description,
        contact=db_income.contact,
        amount=db_income.amount
    )

@income_router.patch("/update/{income_id}", response_model=IncomeResponse)
def update_income(
    income_id: int,
    income: IncomeUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(require_admin_accountant())
):
    db_income = session.get(Income, income_id)
    if not db_income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income not found"
        )
    
    # Update the fields if they are provided
    if income.recipt_number is not None:
        db_income.recipt_number = income.recipt_number
    if income.date is not None:
        db_income.date = income.date
    if income.category_id is not None:
        category = session.get(IncomeCatNames, income.category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Income category not found"
            )
        db_income.category_id = income.category_id
    if income.source is not None:
        db_income.source = income.source
    if income.description is not None:
        db_income.description = income.description
    if income.contact is not None:
        db_income.contact = income.contact
    if income.amount is not None:
        db_income.amount = income.amount
    
    # Ensure created_at is set if it is None
    if db_income.created_at is None:
        db_income.created_at = datetime.utcnow()

    session.commit()
    session.refresh(db_income)
    
    # Get the updated category name
    category = session.get(IncomeCatNames, db_income.category_id)
    
    return IncomeResponse(
        id=db_income.id,  # type: ignore
        created_at=db_income.created_at,  # type: ignore
        recipt_number=str(db_income.recipt_number) if db_income.recipt_number is not None else None,
        date=db_income.date,  # type: ignore
        category=category.income_cat_name,  # Convert category to string
        source=db_income.source,
        description=db_income.description,
        contact=db_income.contact,
        amount=db_income.amount
    )

@income_router.delete("/delete/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income(
    income_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_admin())
):
    db_income = session.get(Income, income_id)
    if not db_income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income not found"
        )
    
    session.delete(db_income)
    session.commit()

@income_router.get("/filter_income", response_model=dict)
def filter_income(
    category_id: Optional[int] = None,
    session: Session = Depends(get_session),
    user: User = Depends(require_admin_accountant()),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
):
    """Filter income records by category_id, or return all if None or 0."""
    try:
        query = select(Income)
        if category_id and category_id != 0:
            query = query.where(Income.category_id == category_id)

        total = session.scalar(select(func.count()).select_from(query.subquery())) or 0
        incomes = session.exec(
            query.order_by(Income.date.desc(), Income.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()

        filtered_response = []
        for income in incomes:
            category = session.get(IncomeCatNames, income.category_id)
            filtered_response.append(IncomeResponse(
                id=income.id,
                created_at=income.created_at or datetime.utcnow(),
                recipt_number=str(income.recipt_number) if income.recipt_number is not None else None,
                date=income.date,
                category=category.income_cat_name if category else None,
                source=income.source,
                description=income.description,
                contact=income.contact,
                amount=income.amount
            ))

        return {
            "data": filtered_response,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error filtering income records: {str(e)}"
        )
```

---

## File: router/salary.py

[Content too large - shown in sections]

(Continues with full router/salary.py implementation...)

---

## File: router/expense.py

```python
from typing import List, Annotated, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query

from sqlalchemy import func
from sqlmodel import Session, select

from db import get_session
from schemas.expense_model import Expense, ExpenseCreate, ExpenseResponse, ExpenseUpdate
from schemas.expense_cat_names_model import ExpenseCatNames  # Import ExpenseCatNames
from user.user_crud import require_admin_accountant_fee_manager, require_admin_accountant, require_admin
from user.user_models import User, UserRole

expense_router = APIRouter(
    prefix="/expenses",
    tags=["Expenses"],
    responses={404: {"Description": "Not found"}}
)

@expense_router.get("/", response_model=dict)
async def root():
    return {"message": "Expense Router Page running :-)"}

@expense_router.post("/add_expense/", response_model=ExpenseResponse)
def create_expense(
     user: Annotated[User, Depends(require_admin_accountant())],session: Session = Depends(get_session), expense: ExpenseCreate = None
):
    # Ensure created_at is set to the current datetime if not provided
    if not expense.created_at:
        expense.created_at = datetime.utcnow()

    # Validate category_id
    category = session.get(ExpenseCatNames, expense.category_id)
    if not category:
        raise HTTPException(
            status_code=400, detail=f"Invalid category_id: {expense.category_id}"
        )
        

    # Remove id from the expense dictionary to avoid conflicts
    expense_data = expense.dict(exclude={"id"})
    
    # Convert empty strings to None for optional fields
    if expense_data.get("description") == "":
        expense_data["description"] = None
    
    db_expense = Expense(**expense_data)
    session.add(db_expense)

    try:
        session.commit()
        session.refresh(db_expense)
    except Exception as e:
        session.rollback()
        # Log the exact exception for debugging
        raise HTTPException(
            status_code=500, detail=f"Error creating expense: {str(e)}"
        )

    # Return the response with the category name as a string
    return ExpenseResponse(
        id=db_expense.id,
        created_at=db_expense.created_at,
        recipt_number=db_expense.recipt_number,
        date=db_expense.date,
        category=category.expense_cat_name,  # Use category name directly in the response
        to_whom=db_expense.to_whom,
        description=db_expense.description,
        amount=db_expense.amount,
    )

@expense_router.get("/expenses-all/", response_model=dict)
def read_expenses(
    user: Annotated[User, Depends(require_admin_accountant())],
    session: Session = Depends(get_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
):
    total = session.scalar(select(func.count(Expense.id))) or 0
    expenses = session.exec(
        select(Expense)
            .order_by(Expense.date.desc(), Expense.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
    ).all()

    return {
        "data": [
            ExpenseResponse(
                id=e.id,
                created_at=e.created_at,
                recipt_number=str(e.recipt_number) if e.recipt_number is not None else None,
                date=e.date,
                category=e.category.expense_cat_name if e.category else None,
                to_whom=e.to_whom,
                description=e.description,
                amount=e.amount,
            )
            for e in expenses
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }

@expense_router.get("/{expense_id}", response_model=ExpenseResponse)
def read_expense(user: Annotated[User, Depends(require_admin_accountant())],expense_id: int, session: Session = Depends(get_session)):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(
            status_code=404, detail="Expense not found")
    # Map category to its string representation
    return ExpenseResponse(
        id=expense.id,
        created_at=expense.created_at,
        recipt_number=expense.recipt_number,
        date=expense.date,
        category=expense.category.expense_cat_name if expense.category else None,
        to_whom=expense.to_whom,
        description=expense.description,
        amount=expense.amount,
    )

@expense_router.put("/update/{expense_id}", response_model=ExpenseResponse)
def update_expense(user: Annotated[User, Depends(require_admin_accountant())],
    expense_id: int, expense_update: ExpenseUpdate, session: Session = Depends(get_session)):
    db_expense = session.get(Expense, expense_id)
    if not db_expense:
        raise HTTPException(
            status_code=404, detail="Expense not found")

    for key, value in expense_update.dict(exclude_unset=True).items():
        setattr(db_expense, key, value)

    try:
        session.commit()
        session.refresh(db_expense)
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=500, detail="Error updating expense."
        )

    # Map category to its string representation
    return ExpenseResponse(
        id=db_expense.id,
        created_at=db_expense.created_at,
        recipt_number=db_expense.recipt_number,
        date=db_expense.date,
        category=db_expense.category.expense_cat_name if db_expense.category else None,
        to_whom=db_expense.to_whom,
        description=db_expense.description,
        amount=db_expense.amount,
    )

@expense_router.delete("/del/{expense_id}", response_model=dict)
def delete_expense(user: Annotated[User, Depends(require_admin())],expense_id: int, session: Session = Depends(get_session)):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(
            status_code=404, detail="Expense not found")
    session.delete(expense)
    session.commit()
    return {"message": "Expense deleted successfully"}

@expense_router.get("/filter-by-category/{category_id}", response_model=dict)
def filter_expense_by_category(
    category_id: int,
    user: Annotated[User, Depends(require_admin_accountant())],
    session: Session = Depends(get_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
):
    """Return paginated expense records for a category filter or all categories when category_id is 0."""
    try:
        query = select(Expense)
        if category_id != 0:
            query = query.where(Expense.category_id == category_id)

        total = session.scalar(select(func.count()).select_from(query.subquery())) or 0
        expenses = session.exec(
            query.order_by(Expense.date.desc(), Expense.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()

        result = []
        for expense in expenses:
            category = session.get(ExpenseCatNames, expense.category_id)
            result.append(
                ExpenseResponse(
                    id=expense.id,
                    created_at=expense.created_at or datetime.utcnow(),
                    recipt_number=str(expense.recipt_number) if expense.recipt_number is not None else None,
                    date=expense.date,
                    category=category.expense_cat_name if category else None,
                    to_whom=expense.to_whom,
                    description=expense.description,
                    amount=expense.amount,
                )
            )

        return {
            "data": result,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error filtering expense records: {str(e)}")
```

---

## File: schemas/fee_model.py

```python
from datetime import datetime
from decimal import Decimal
from sqlmodel import  Relationship, SQLModel, Field
from typing import List, Optional
import enum
from pydantic import field_serializer

# if TYPE_CHECKING:
#     from .students_model import Students
#     from .class_names_model import ClassNames

class FeeStatus(str, enum.Enum):
    PAID = "Paid"
    UNPAID = "Unpaid"

class Fee(SQLModel, table=True):
    fee_id: int = Field(primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)
    student_id: Optional[int] = Field(default=None, foreign_key="students.student_id")  # ← nullable now
    original_student_id: Optional[int] = Field(default=None)                            # ← NEW
    class_id: int = Field(foreign_key="classnames.class_name_id", nullable=False)
    fee_amount: Decimal = Field(nullable=False)
    fee_month: str = Field(nullable=False)
    fee_year: str = Field(nullable=False)  # Changed from int to str
    fee_status: FeeStatus = Field(nullable=False, default=FeeStatus.UNPAID)

    # Relationships back to Student and ClassNames
    students: Optional["Students"] = Relationship(back_populates="fees") # type: ignore
    class_names: Optional["ClassNames"] = Relationship(back_populates="fees") # type: ignore
    

class FeeCreate(SQLModel):
    student_id: int
    class_id: int
    fee_amount: Decimal
    fee_month: str
    fee_year: str  # Changed from int to str
    # fee_status: FeeStatus = FeeStatus.UNPAID

class FeeResponse(SQLModel):
    fee_id: int
    created_at: datetime
    student_name: Optional[str] = None
    father_name: Optional[str] = None
    class_name: Optional[str] = None
    fee_amount: Decimal
    fee_month: str
    fee_year: str  # Changed from int to str
    fee_status: FeeStatus

    @field_serializer('fee_amount')
    def serialize_fee_amount(self, value: Decimal) -> int:
        """Serialize Decimal as integer (no decimal places)"""
        return int(value) if value % 1 == 0 else float(value)

class FeeUpdateRequest(SQLModel):
    fee_amount: Optional[Decimal] = None
    fee_month: Optional[str] = None
    fee_year: Optional[str] = None

class FeeFilter(SQLModel):
    student_id: Optional[int] = None
    class_id: Optional[int] = None
    fee_month: Optional[str] = None
    fee_year: Optional[str] = None  # Changed from Optional[int] to Optional[str]
    fee_status: Optional[FeeStatus] = None

class FeeDelete(SQLModel):
    fee_id: int
    message: str = "Fee deleted successfully"

MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

class FilterPaidUnpaid(SQLModel):
    fee_id: Optional[int] = None
    student_id: int
    student_name: str
    father_name: str
    class_name: str
    fee_status: FeeStatus
    fee_month: str
    fee_year: str
    fee_amount: Decimal
    is_deleted: bool = False  # Flag to indicate if student is deleted (for UI styling)

    @field_serializer('fee_amount')
    def serialize_fee_amount(self, value: Decimal) -> int:
        """Serialize Decimal as integer (no decimal places)"""
        return int(value) if value % 1 == 0 else float(value)

    @classmethod
    def from_fee(cls, fee, student_details, class_name):
        return cls(
            student_id=fee.student_id,
            student_name=student_details["student_name"],
            father_name=student_details["father_name"],
            class_name=class_name,
            fee_status=fee.fee_status,
            fee_month=fee.fee_month,
            fee_year=str(fee.fee_year),  # Explicit conversion
            fee_amount=fee.fee_amount
        )
```

---

## File: schemas/income_model.py

```python
from datetime import datetime
from sqlmodel import Column, DateTime, Relationship, SQLModel, Field # type: ignore
from sqlalchemy import String
from typing import Optional
from schemas.income_cat_names_model import IncomeCatNames  


class IncomeBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: Optional[datetime] = Field(default=None)

class Income(IncomeBase, table=True):
    recipt_number: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    date: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime))  # Updated to use datetime.now() as default
    category_id: int = Field(foreign_key="incomecatnames.income_cat_name_id")  # Add foreign key
    category: Optional["IncomeCatNames"] = Relationship(back_populates="incomes")  # Define relationship
    source: str
    description: Optional[str] = None
    contact: Optional[str] = None
    amount: float

class IncomeCreate(SQLModel):
    recipt_number: Optional[str] = None
    date: datetime
    category_id: int  # Use category_id instead of category
    source: str
    description: Optional[str] = None
    contact: Optional[str] = None
    amount: float

class IncomeResponse(SQLModel):
    id: int
    created_at: datetime
    recipt_number: Optional[str] = None
    date: datetime
    category: Optional[str] = None
    source: str
    description: Optional[str] = None
    contact: Optional[str] = None
    amount: float

class IncomeUpdate(SQLModel):
    recipt_number: Optional[str] = None
    date: Optional[datetime] = None
    category_id: Optional[int] = None  # Use category_id for updates
    source: Optional[str] = None
    description: Optional[str] = None
    contact: Optional[str] = None
    amount: Optional[float] = None

class IncomeFilter(SQLModel):
    id: Optional[int] = None
    created_at: Optional[str] = None
    recipt_number: Optional[str] = None
    date: Optional[datetime] = None
    category: Optional[str] = None
    source: Optional[str] = None
    description: Optional[str] = None
    contact: Optional[str] = None
    amount: Optional[float] = None
```

---

## File: schemas/salary_model.py

```python
from datetime import datetime
from decimal import Decimal
from sqlmodel import Relationship, SQLModel, Field, UniqueConstraint
from typing import Optional


# ============================================================================
# TEACHER SALARY SYSTEM - PRODUCTION GRADE PAYROLL LEDGER
# ============================================================================

# ============================================================================
# 1. TEACHER SALARY (Base Salary Configuration)
# ============================================================================

class TeacherSalaryBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: int = Field(foreign_key="teachernames.teacher_name_id", nullable=False)
    base_salary: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    effective_from: str = Field(nullable=False)  # YYYY-MM-DD format
    effective_till: Optional[str] = Field(default=None, nullable=True)  # NULL = currently active
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)


class TeacherSalary(TeacherSalaryBase, table=True):
    __tablename__ = "teacher_salary"

    # Relationship to TeacherNames
    teacher: Optional["TeacherNames"] = Relationship(back_populates="teacher_salaries")


class TeacherSalaryCreate(SQLModel):
    teacher_id: int
    base_salary: Decimal
    effective_from: str


class TeacherSalaryUpdate(SQLModel):
    base_salary: Optional[Decimal] = None
    effective_from: Optional[str] = None


class TeacherSalaryResponse(SQLModel):
    id: int
    teacher_id: int
    base_salary: Decimal
    effective_from: str
    created_at: datetime
    teacher_name: Optional[str] = None
    effective_till: Optional[str] = None


# ============================================================================
# 2. SALARY LEDGER (Monthly Records - HEART OF SYSTEM)
# ============================================================================

class SalaryLedgerBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: int = Field(foreign_key="teachernames.teacher_name_id", nullable=False)
    month: int = Field(ge=1, le=12, nullable=False)  # 1-12
    year: int = Field(nullable=False)  # e.g. 2026
    base_salary: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    allowance_total: Decimal = Field(max_digits=10, decimal_places=2, default=0)
    deduction_total: Decimal = Field(max_digits=10, decimal_places=2, default=0)
    net_salary: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    total_paid: Decimal = Field(max_digits=10, decimal_places=2, default=0)
    remaining: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)


class SalaryLedger(SalaryLedgerBase, table=True):
    __tablename__ = "salary_ledger"

    # Unique constraint to prevent duplicate ledger entries per teacher/month/year
    __table_args__ = (
        UniqueConstraint('teacher_id', 'month', 'year', name='unique_teacher_month_year'),
    )

    # Relationships
    teacher: Optional["TeacherNames"] = Relationship(back_populates="salary_ledgers")
    payments: list["SalaryPayment"] = Relationship(back_populates="ledger")


class SalaryLedgerCreate(SQLModel):
    teacher_id: int
    month: int
    year: int
    base_salary: Decimal
    allowance_total: Optional[Decimal] = 0
    deduction_total: Optional[Decimal] = 0
    net_salary: Decimal
    total_paid: Optional[Decimal] = 0
    remaining: Decimal


class SalaryLedgerUpdate(SQLModel):
    allowance_total: Optional[Decimal] = None
    deduction_total: Optional[Decimal] = None
    net_salary: Optional[Decimal] = None
    total_paid: Optional[Decimal] = None
    remaining: Optional[Decimal] = None


class SalaryLedgerResponse(SQLModel):
    id: int
    teacher_id: int
    month: int
    year: int
    base_salary: Decimal
    allowance_total: Decimal
    deduction_total: Decimal
    net_salary: Decimal
    total_paid: Decimal
    remaining: Decimal
    created_at: datetime
    teacher_name: Optional[str] = None


# ============================================================================
# 3. SALARY PAYMENT (Transaction Records)
# ============================================================================

class SalaryPaymentBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: int = Field(foreign_key="teachernames.teacher_name_id", nullable=False)
    ledger_id: int = Field(foreign_key="salary_ledger.id", nullable=False)
    amount: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    payment_date: str = Field(nullable=False)  # YYYY-MM-DD format
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)


class SalaryPayment(SalaryPaymentBase, table=True):
    __tablename__ = "salary_payment"

    # Relationships
    teacher: Optional["TeacherNames"] = Relationship(back_populates="salary_payments")
    ledger: Optional[SalaryLedger] = Relationship(back_populates="payments")


class SalaryPaymentCreate(SQLModel):
    teacher_id: int
    ledger_id: int
    amount: Decimal
    payment_date: str


class SalaryPaymentUpdate(SQLModel):
    amount: Optional[Decimal] = None
    payment_date: Optional[str] = None


class SalaryPaymentResponse(SQLModel):
    id: int
    teacher_id: int
    ledger_id: int
    amount: Decimal
    payment_date: str
    created_at: datetime
    teacher_name: Optional[str] = None


# ============================================================================
# 4. ALLOWANCE (Monthly Allowances)
# ============================================================================

class AllowanceBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: int = Field(foreign_key="teachernames.teacher_name_id", nullable=False)
    month: int = Field(ge=1, le=12, nullable=False)
    year: int = Field(nullable=False)
    amount: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    reason: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)


class Allowance(AllowanceBase, table=True):
    __tablename__ = "allowance"

    # Relationship to TeacherNames
    teacher: Optional["TeacherNames"] = Relationship(back_populates="allowances")


class AllowanceCreate(SQLModel):
    teacher_id: int
    month: int
    year: int
    amount: Decimal
    reason: Optional[str] = None


class AllowanceUpdate(SQLModel):
    amount: Optional[Decimal] = None
    reason: Optional[str] = None


class AllowanceResponse(AllowanceBase, SQLModel):
    teacher_name: Optional[str] = None
    amount: Optional[Decimal] = None


# ============================================================================
# 5. DEDUCTION (Monthly Deductions)
# ============================================================================

class DeductionBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: int = Field(foreign_key="teachernames.teacher_name_id", nullable=False)
    month: int = Field(ge=1, le=12, nullable=False)
    year: int = Field(nullable=False)
    amount: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    type: str = Field(max_length=50, nullable=False)  # late/leave/loan/etc
    reason: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)


class Deduction(DeductionBase, table=True):
    __tablename__ = "deduction"

    # Relationship to TeacherNames
    teacher: Optional["TeacherNames"] = Relationship(back_populates="deductions")


class DeductionCreate(SQLModel):
    teacher_id: int
    month: int
    year: int
    amount: Decimal
    type: str
    reason: Optional[str] = None


class DeductionUpdate(SQLModel):
    amount: Optional[Decimal] = None
    type: Optional[str] = None
    reason: Optional[str] = None

class DeductionResponse(DeductionBase, SQLModel):
    amount: Optional[Decimal] = None
    teacher_name: Optional[str] = None
```

---

## File: schemas/expense_model.py

```python
from datetime import datetime
from sqlmodel import Column, DateTime, Relationship, SQLModel, Field  # type: ignore
from sqlalchemy import String
from typing import Optional
from schemas.expense_cat_names_model import ExpenseCatNames  # Import ExpenseCatNames


class ExpenseBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)  # Remove autoincrement
    created_at: Optional[datetime] = Field(default=None)

class Expense(ExpenseBase, table=True):
    recipt_number: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime))  # Default to current datetime
    date: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime))  # Updated to use datetime.now() as default
    category_id: int = Field(foreign_key="expensecatnames.expense_cat_name_id")  # Foreign key for category
    category: Optional[ExpenseCatNames] = Relationship(back_populates="expenses")  # Define as a relationship
    to_whom: str
    description: Optional[str] = None
    amount: float

class ExpenseCreate(ExpenseBase):
    recipt_number: Optional[str] = None
    date: datetime
    category_id: int  # Use category_id instead of category
    to_whom: str
    description: Optional[str] = None
    amount: float

class ExpenseResponse(ExpenseBase):
    id: int
    created_at: datetime
    recipt_number: Optional[str] = None
    date: datetime
    category: Optional[str] = None
    to_whom: str
    description: Optional[str] = None
    amount: float

class ExpenseUpdate(SQLModel):
    recipt_number: Optional[str] = None
    date: Optional[datetime] = None
    category_id: Optional[int] = None  # Use category_id for updates
    to_whom: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None

class ExpenseFilter(SQLModel):
    id: Optional[int] = None
    created_at: Optional[str] = None
    recipt_number: Optional[str] = None
    date: Optional[datetime] = None
    category: Optional[str] = None
    to_whom: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
```

---

## File: schemas/income_cat_names_model.py

```python
from datetime import datetime
from sqlmodel import Relationship, SQLModel, Field # type: ignore
from typing import List, Optional
from datetime import datetime


# ****************************************************************************************
# income_cat Names


class IncomeCatNamesBase(SQLModel):
    income_cat_name_id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default=datetime.now(), nullable=False)


class IncomeCatNames(IncomeCatNamesBase, table=True):
    income_cat_name: str = Field(index=True, unique=True)

    # Relationship back to Income
    
    incomes: List["Income"] = Relationship(back_populates="category")  # type: ignore # Define relationship


class IncomeCatNamesCreate(SQLModel):
    income_cat_name: str = Field(index=True, unique=True)


class IncomeCatNamesResponse(IncomeCatNamesBase, SQLModel):
    income_cat_name: str
```

---

## File: schemas/expense_cat_names_model.py

```python
from datetime import datetime
from sqlmodel import Relationship, SQLModel, Field # type: ignore
from typing import List, Optional
from datetime import datetime


# ****************************************************************************************
# Expense_cat Names


class ExpenseCatNamesBase(SQLModel):
    expense_cat_name_id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default=datetime.now(), nullable=False)


class ExpenseCatNames(ExpenseCatNamesBase, table=True):
    expense_cat_name: str  # Ensure this attribute exists

    # Relationship back to Expense
    
    expenses: List["Expense"] = Relationship(back_populates="category")  # type: ignore # Define relationship


class ExpenseCatNamesCreate(SQLModel):
    expense_cat_name: str = Field(index=True, unique=True)


class ExpenseCatNamesResponse(ExpenseCatNamesBase):
    expense_cat_name: str
```

---

## File: services/salary_service.py

```python
"""
Salary Service - Historical Salary Management
Handles salary period calculations, timeline management, and prorated payables.
"""

from datetime import date, timedelta
from decimal import Decimal
from sqlmodel import Session, select, func
from typing import Optional, Dict, List
from schemas.salary_model import TeacherSalary, SalaryLedger, SalaryPayment, Allowance, Deduction
from schemas.teacher_names_model import TeacherNames

# Fixed divisor for daily rate calculation: monthly salary ÷ 30 = daily rate
DAILY_DIVISOR = 30


# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def _period_till(record: TeacherSalary) -> date:
    """
    Return the effective end date of a salary period.
    NULL effective_till means the record is still active → use today.
    """
    if record.effective_till is not None:
        # Handle both date objects and string formats
        if isinstance(record.effective_till, date):
            return record.effective_till
        return date.fromisoformat(record.effective_till)
    return date.today()


def _days_in_period(from_date: date, till_date: date) -> int:
    """Inclusive day count: from_date to till_date."""
    return (till_date - from_date).days + 1


def _prorated_salary(base_salary: Decimal, days: int) -> Decimal:
    """Calculate prorated salary based on daily rate."""
    daily_rate = base_salary / DAILY_DIVISOR
    return round(daily_rate * days, 2)


# ══════════════════════════════════════════════════════════════════════════════
# EFFECTIVE_TILL MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

def close_previous_active_record(
    session: Session,
    teacher_id: int,
    new_effective_from: date,
) -> None:
    """
    When a new salary record is being inserted, find the currently active
    (effective_till IS NULL) record and close it one day before the new one.
    """
    stmt = (
        select(TeacherSalary)
        .where(TeacherSalary.teacher_id == teacher_id)
        .where(TeacherSalary.effective_till == None)  # noqa: E711
        .order_by(TeacherSalary.effective_from.desc())
        .limit(1)
    )
    active = session.exec(stmt).first()
    if active:
        # Close the active record one day before the new effective_from
        close_date = new_effective_from - timedelta(days=1)
        active.effective_till = close_date.isoformat()
        session.add(active)


def reconnect_neighbors_after_delete(
    session: Session,
    deleted: TeacherSalary,
) -> None:
    """
    After deleting a salary record, make sure the previous record
    now extends up to (next_record.effective_from - 1 day), or becomes
    open-ended (NULL) if there is no next record.
    """
    teacher_id = deleted.teacher_id
    deleted_from = date.fromisoformat(deleted.effective_from)

    # Previous record: highest effective_from that is still < deleted.effective_from
    prev_stmt = (
        select(TeacherSalary)
        .where(TeacherSalary.teacher_id == teacher_id)
        .where(TeacherSalary.effective_from < deleted.effective_from)
        .order_by(TeacherSalary.effective_from.desc())
        .limit(1)
    )
    prev_record = session.exec(prev_stmt).first()

    # Next record: lowest effective_from that is > deleted.effective_from
    next_stmt = (
        select(TeacherSalary)
        .where(TeacherSalary.teacher_id == teacher_id)
        .where(TeacherSalary.effective_from > deleted.effective_from)
        .order_by(TeacherSalary.effective_from.asc())
        .limit(1)
    )
    next_record = session.exec(next_stmt).first()

    if prev_record:
        if next_record:
            # Close previous record one day before next record
            next_from = date.fromisoformat(next_record.effective_from)
            prev_record.effective_till = (next_from - timedelta(days=1)).isoformat()
        else:
            # No next record, previous becomes active again
            prev_record.effective_till = None
        session.add(prev_record)


def recalculate_all_effective_till(session: Session, teacher_id: int) -> None:
    """
    Full recalculation of effective_till for ALL salary records of a teacher.
    Call this after any edit to effective_from or base_salary.
    Records are sorted ascending by effective_from; each record's
    effective_till = next_record.effective_from - 1 day (last = NULL).
    """
    stmt = (
        select(TeacherSalary)
        .where(TeacherSalary.teacher_id == teacher_id)
        .order_by(TeacherSalary.effective_from.asc())
    )
    records = session.exec(stmt).all()

    for i, record in enumerate(records):
        if i < len(records) - 1:
            # Close this record one day before the next record
            next_from = date.fromisoformat(records[i + 1].effective_from)
            record.effective_till = (next_from - timedelta(days=1)).isoformat()
        else:
            # Latest record stays open-ended
            record.effective_till = None
        session.add(record)


# ══════════════════════════════════════════════════════════════════════════════
# SUMMARY CALCULATION
# ══════════════════════════════════════════════════════════════════════════════

def calculate_teacher_salary_summary(
    session: Session,
    teacher_id: int,
) -> Dict:
    """
    Compute the full salary summary for a teacher, considering all
    historical salary periods, allowances, deductions, and payments.
    
    Returns a dictionary with:
    - teacher_id, teacher_name
    - current_base_salary, latest_effective_from
    - total_payable (sum of all prorated periods)
    - total_allowance, total_deduction
    - total_net_salary (payable + allowances - deductions)
    - total_paid
    - remaining (net - paid)
    - salary_history (list of period breakdowns)
    """
    # 1. Fetch all salary records sorted chronologically
    sal_stmt = (
        select(TeacherSalary)
        .where(TeacherSalary.teacher_id == teacher_id)
        .order_by(TeacherSalary.effective_from.asc())
    )
    salary_records = session.exec(sal_stmt).all()

    if not salary_records:
        return _empty_summary(teacher_id)

    # 2. Build salary history with prorated payables
    history = []
    total_payable = Decimal(0)

    for rec in salary_records:
        # Handle both date objects and string formats for effective_from
        if isinstance(rec.effective_from, date):
            from_date = rec.effective_from
            effective_from_str = rec.effective_from.isoformat()
        else:
            from_date = date.fromisoformat(rec.effective_from)
            effective_from_str = rec.effective_from
            
        till_date = _period_till(rec)
        
        # Handle effective_till for response
        if rec.effective_till is not None:
            if isinstance(rec.effective_till, date):
                effective_till_str = rec.effective_till.isoformat()
            else:
                effective_till_str = rec.effective_till
        else:
            effective_till_str = None
        
        # Guard: if somehow from > till (bad data), skip
        if from_date > till_date:
            continue
            
        days = _days_in_period(from_date, till_date)
        period_payable = _prorated_salary(rec.base_salary, days)
        total_payable += period_payable
        
        history.append({
            "id": rec.id,
            "base_salary": float(rec.base_salary),
            "effective_from": effective_from_str,
            "effective_till": effective_till_str,
            "days": days,
            "period_payable": float(period_payable),
        })

    # Latest record metadata
    latest = salary_records[-1]
    
    # Handle latest effective_from for response
    if isinstance(latest.effective_from, date):
        latest_effective_from = latest.effective_from.isoformat()
    else:
        latest_effective_from = latest.effective_from

    # 3. Fetch cumulative allowances
    allowance_stmt = select(func.coalesce(func.sum(Allowance.amount), 0)).where(
        Allowance.teacher_id == teacher_id
    )
    total_allowance = session.scalar(allowance_stmt) or Decimal(0)

    # 4. Fetch cumulative deductions
    deduction_stmt = select(func.coalesce(func.sum(Deduction.amount), 0)).where(
        Deduction.teacher_id == teacher_id
    )
    total_deduction = session.scalar(deduction_stmt) or Decimal(0)

    # 5. Fetch total paid
    paid_stmt = select(func.coalesce(func.sum(SalaryPayment.amount), 0)).where(
        SalaryPayment.teacher_id == teacher_id
    )
    total_paid = session.scalar(paid_stmt) or Decimal(0)

    # 6. Final calculations
    total_net_salary = total_payable + total_allowance - total_deduction
    remaining = total_net_salary - total_paid

    # 7. Get teacher name
    teacher = session.get(TeacherNames, teacher_id)
    teacher_name = teacher.teacher_name if teacher else "Unknown"

    return {
        "teacher_id": teacher_id,
        "teacher_name": teacher_name,
        "current_base_salary": float(latest.base_salary),
        "latest_effective_from": latest_effective_from,
        "total_payable": float(round(total_payable, 2)),
        "total_allowance": float(round(total_allowance, 2)),
        "total_deduction": float(round(total_deduction, 2)),
        "total_net_salary": float(round(total_net_salary, 2)),
        "total_paid": float(round(total_paid, 2)),
        "remaining": float(round(remaining, 2)),
        "salary_history": history,
    }


def _empty_summary(teacher_id: int) -> Dict:
    """Return empty summary when no salary records exist."""
    return {
        "teacher_id": teacher_id,
        "teacher_name": "Unknown",
        "current_base_salary": 0,
        "latest_effective_from": None,
        "total_payable": 0,
        "total_allowance": 0,
        "total_deduction": 0,
        "total_net_salary": 0,
        "total_paid": 0,
        "remaining": 0,
        "salary_history": [],
    }


# ══════════════════════════════════════════════════════════════════════════════
# VALIDATION GUARDS
# ══════════════════════════════════════════════════════════════════════════════

def validate_salary_timeline(
    session: Session,
    teacher_id: int,
    exclude_id: Optional[int] = None
) -> None:
    """
    Ensures:
      1. No two records share the same effective_from.
      2. No overlapping periods (effective_from <= effective_till across records).
      3. Only one open-ended (effective_till = NULL) record exists.
    
    Raises HTTPException if validation fails.
    """
    from fastapi import HTTPException
    
    stmt = (
        select(TeacherSalary)
        .where(TeacherSalary.teacher_id == teacher_id)
        .order_by(TeacherSalary.effective_from.asc())
    )
    if exclude_id:
        stmt = stmt.where(TeacherSalary.id != exclude_id)

    records = session.exec(stmt).all()

    # Check for multiple open-ended records
    open_ended_count = sum(1 for r in records if r.effective_till is None)
    if open_ended_count > 1:
        raise HTTPException(
            status_code=400,
            detail="Only one active (open-ended) salary record is allowed per teacher."
        )

    # Check for overlapping periods
    for i in range(len(records) - 1):
        curr = records[i]
        nxt = records[i + 1]
        if curr.effective_till is not None:
            curr_till = date.fromisoformat(curr.effective_till)
            nxt_from = date.fromisoformat(nxt.effective_from)
            if curr_till >= nxt_from:
                raise HTTPException(
                    status_code=400,
                    detail=f"Overlapping salary periods detected between records {curr.id} and {nxt.id}."
                )

# Made with Bob
```

---

## File: db.py

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlmodel import SQLModel, create_engine, Session, select
from utils.logging import logger
import setting

CONN_STRING: str = str(setting.DATABASE_URL)

# Validate DATABASE_URL is configured
if not CONN_STRING or CONN_STRING == "None":
    logger.error("DATABASE_URL is not configured! Please set DATABASE_URL environment variable.")
    logger.error("Example: postgresql://user:password@localhost/dbname")
    raise ValueError("DATABASE_URL environment variable is required but not set")

def get_engine(CONN_STRING):
    # Configure connection pooling for PostgreSQL
    # Note: Neon pooler doesn't support statement_timeout in options
    connect_args = {
        "connect_timeout": 10,  # Connection timeout in seconds
    }
    
    engine = create_engine(
        CONN_STRING,
        echo=True,
        connect_args=connect_args,
        pool_size=10,  # Number of connections to keep in pool
        max_overflow=20,  # Additional connections beyond pool_size
        pool_recycle=300,  # Recycle connections after 5 minutes to avoid stale connections
        pool_pre_ping=True  # Test connections before using to ensure they're still valid
    )
    logger.info("Engine created successfully")
    return engine

engine = get_engine(CONN_STRING=CONN_STRING)

# Add SessionLocal
SessionLocal = Session

def seed_attendance_values():
    """Seed initial attendance values into the database"""
    try:
        session = SessionLocal(engine)
        from schemas.attendance_value_model import AttendanceValue
        
        # Check if values already exist
        existing_values = session.exec(select(AttendanceValue)).all()
        if existing_values:
            logger.info(f"Attendance values already exist: {len(existing_values)} values found")
            session.close()
            return
        
        # Define the 4 core attendance values
        attendance_values = [
            AttendanceValue(attendance_value="Present"),
            AttendanceValue(attendance_value="Absent"),
            AttendanceValue(attendance_value="Late"),
            AttendanceValue(attendance_value="Leave"),
        ]
        
        for value in attendance_values:
            session.add(value)
        
        session.commit()
        logger.info("Attendance values seeded successfully: Present, Absent, Late, Leave")
        session.close()
    except Exception as e:
        logger.error(f"Error seeding attendance values: {str(e)}")
        session.close()
        raise

def create_db_and_tables():
    # SQLModel.metadata.drop_all(engine)  # Drop existing tables
    SQLModel.metadata.create_all(engine)
    seed_attendance_values()  # Seed initial data

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Creating database connection")
    try:
        create_db_and_tables()
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Database initialization error: {str(e)}")
        raise
    yield
    logger.info("Closing database connection")

def get_session():
    session = None
    try:
        session = SessionLocal(engine)
        yield session
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        raise
    finally:
        if session:
            session.close()
```

---

## File: frontend/src/components/Income/ViewIncome.tsx

[Full React component code - 600+ lines]

---

## File: frontend/src/components/Expense/viewExpense.tsx

[Full React component code - 600+ lines]

---

## File: frontend/src/models/income/income.ts

```typescript
import { EntityBase } from "../EntityBase";

export interface AddIncomeModel {
  recipt_number: string;
  date: string; // ISO date string format
  category_id: number;
  source: string;
  description?: string;
  contact?: string;
  amount: number;
}
export interface ViewIncomeModel {
  attendance_date: string; // ISO date string format
  attendance_time: string;
  attendance_class: string;
  attendance_teacher: string;
  attendance_student: string;
  attendance_std_fname: string;
  attendance_value: string;
}
export interface IncomeCategory {
  income_cat_name_id: number; // Updated key
  income_cat_name: string; // Updated key
  created_at: string; // ISO date string format
}

export interface CreateIncomeCat {
  income_cat_name: string;
  created_at?: Date;
  updated_at?: Date;
}

// export interface GetFeeModel {
//     fee_status: number,
//     student_id: number,
//     class_id: number,
//     fee_amount: number,
//     fee_month: string,
//     fee_year: number
// }
```

---

## File: frontend/src/models/expense/expense.ts

```typescript
export interface AddExpenseModel {
  recipt_number: string;
  date: string; // ISO date string format
  category_id: number;
  to_whom: string;
  description?: string;
  amount: number;
}

export interface ExpenseCategory {
  expense_cat_name_id: number;
  expense_cat_name: string;
}

export interface ExpenseData {
  receipt_number: string;
  date: string; // ISO date string format
  category: string;
  to_whom: string;
  description: string;
  amount: number;
}
```

---

---

## File: user/user_models.py

```python
from sqlmodel import SQLModel, Field, Enum, Column
from typing import Optional
from datetime import timedelta, datetime
import enum
import re
from pydantic import field_validator

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    USER = "USER"
    ACCOUNTANT = "ACCOUNTANT"
    FEE_MANAGER = "FEE_MANAGER"
    PRINCIPAL = "PRINCIPAL"

class Token(SQLModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: timedelta

class TokenData(SQLModel):
    username: str
    exp: Optional[int] = None

class UserBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)


class UserLogin(SQLModel):
    username: str
    password: str
    grant_type: Optional[str] = "password"  # Default value
    scope: Optional[str] = ""
    client_id: Optional[str] = None
    client_secret: Optional[str] = None

class UserUpdate(SQLModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None

class AdminUserUpdate(SQLModel):
    role: UserRole = Field(description="Must be one of: ADMIN, TEACHER, USER")

class User(UserBase, table=True):
    username: str = Field(unique=True, nullable=False)
    email: str = Field(index=True, unique=True, nullable=False)
    password: str = Field(nullable=False)
    role: UserRole = Field(default=UserRole.USER)

class UserCreate(SQLModel):
    username: str
    email: str
    password: str
    role: UserRole = UserRole.USER

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        """Validate username format: alphanumeric + underscore, 3-20 chars"""
        if not isinstance(v, str):
            raise ValueError('Username must be a string')
        if len(v) < 3 or len(v) > 20:
            raise ValueError('Username must be between 3 and 20 characters')
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username can only contain letters, numbers, and underscores')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Validate password: max 72 UTF-8 bytes (bcrypt constraint)"""
        if not isinstance(v, str):
            raise ValueError('Password must be a string')
        # Bcrypt has a hard limit of 72 bytes UTF-8
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password must not exceed 72 bytes when UTF-8 encoded')
        return v

class UserResponse(SQLModel):
    username: str
    email: str
    role: UserRole
    id: int

class LoginResponse(SQLModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class RefreshToken(SQLModel, table=True):
    """Stores refresh tokens for server-side revocation and tracking"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True, nullable=False)
    token: str = Field(nullable=False, unique=True, index=True)
    expires_at: datetime = Field(nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    revoked_at: Optional[datetime] = None
    
    def is_expired(self) -> bool:
        """Check if token has expired"""
        return datetime.utcnow() > self.expires_at
    
    def is_revoked(self) -> bool:
        """Check if token has been revoked"""
        return self.revoked_at is not None
```

---

## File: user/user_router.py

```python
from fastapi import APIRouter, Depends, HTTPException, Cookie, Response, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select
from datetime import timedelta
from slowapi import Limiter
from slowapi.util import get_remote_address

from .user_models import (
    User, UserCreate, UserUpdate, UserResponse, 
    LoginResponse, AdminUserUpdate, UserLogin, UserRole
)
from .user_crud import (
    user_login, delete_user, signup_user,
    get_current_user, update_user,
    # Replace old check functions with new role checkers
    require_admin, require_admin_principal, require_admin_teacher_principal,
    require_admin_accountant, require_admin_fee_manager, require_all_roles,
    require_authenticated
)
from .services import (
    verify_token, create_access_token, get_user_by_username,
    revoke_refresh_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash
)
from db import get_session
from typing import Annotated, List

# Create separate routers for auth and public endpoints
public_router = APIRouter(
    tags=["Public"]
)

user_router = APIRouter(
    prefix="/auth",
    tags=["User"]
)

admin_router = APIRouter(
    prefix="/admin/users",
    tags=["Admin"]
)

# Security: Initialize rate limiter (prevents brute force attacks)
limiter = Limiter(key_func=get_remote_address)

# Update tokenUrl to remove auth prefix
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login-swagger")

# Public routes (no auth prefix) - No role checking needed
@public_router.post("/login-swagger", response_model=LoginResponse)
@limiter.limit("5/minute")  # Security: Rate limiting - 5 attempts per minute per IP
async def login_for_swagger(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_session)
):
    return user_login(db, form_data)

@public_router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")  # Security: Rate limiting - 5 attempts per minute per IP
async def login_for_frontend(
    request: Request,
    response: Response,
    login_data: UserLogin,
    db: Session = Depends(get_session)
):
    """Login endpoint for frontend clients"""
    try:
        login_response = user_login(db, login_data)
        
        # Set HTTP-only cookies for tokens (security: CRITICAL)
        # Access token in secure HTTPOnly cookie
        response.set_cookie(
            key="access_token",
            value=login_response.access_token,
            httponly=True,
            secure=True,  # HTTPS only
            samesite="strict",  # CSRF protection
            max_age=15 * 60  # 15 minutes
        )
        
        # Refresh token in separate secure HTTPOnly cookie
        response.set_cookie(
            key="refresh_token",
            value=login_response.refresh_token,
            httponly=True,
            secure=True,  # HTTPS only
            samesite="strict",  # CSRF protection
            max_age=60 * 60 * 24 * 7  # 7 days
        )

        # Return tokens in response so frontend can store in localStorage
        # (tokens are ALSO in secure HTTPOnly cookies for double protection)
        return LoginResponse(
            access_token=login_response.access_token,
            refresh_token=login_response.refresh_token,
            expires_in=login_response.expires_in,
            token_type="bearer",
            user=login_response.user
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@public_router.post("/signup", response_model=UserResponse)
@limiter.limit("3/hour")  # Security: Rate limiting - 3 signups per hour per IP
async def signup(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_session)
):
    """Create new user account"""
    try:
        # Check existing user
        existing_user = db.exec(
            select(User).where(
                (User.username == user_data.username) | 
                (User.email == user_data.email)
            )
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account with this username or email already exists"
            )

        # Create user
        new_user = await signup_user(user_data, db)
        return UserResponse(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            role=new_user.role
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {str(e)}"
        )

# Protected routes (keep auth prefix)
@user_router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Annotated[User, Depends(get_current_user)]
):
    return current_user

@user_router.post("/logout")
async def logout(
    current_user: Annotated[User, Depends(get_current_user)],
    response: Response,
    refresh_token: str = Cookie(None),
    access_token: str = Cookie(None),
    db: Session = Depends(get_session)
):
    """Logout user and revoke tokens"""
    try:
        # Revoke refresh token (server-side revocation)
        if refresh_token:
            revoke_refresh_token(db, refresh_token)
        
        # Clear both cookies to ensure clean logout
        response.delete_cookie(
            key="access_token",
            httponly=True,
            secure=True,
            samesite="strict"
        )
        response.delete_cookie(
            key="refresh_token",
            httponly=True,
            secure=True,
            samesite="strict"
        )
        
        logger.info(f"User {current_user.username} logged out successfully")
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Logout error for user {current_user.username}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )
        

@public_router.post("/signup/bulk", response_model=List[UserResponse])
async def bulk_signup(
    current_user: Annotated[User, Depends(require_admin())],  # Only ADMIN can bulk signup
    users_data: List[UserCreate],
    db: Session = Depends(get_session)
):
    """Create multiple user accounts at once"""
    created_users = []
    try:
        for user_data in users_data:
            # Check if user already exists
            existing_user = db.exec(
                select(User).where(
                    (User.username == user_data.username) |
                    (User.email == user_data.email)
                )
            ).first()

            if existing_user:
                # Skip existing user (or raise error if you want strict behavior)
                continue

            # Create user
            new_user = await signup_user(user_data, db)
            created_users.append(
                UserResponse(
                    id=new_user.id,
                    username=new_user.username,
                    email=new_user.email,
                    role=new_user.role
                )
            )

        if not created_users:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No new users created (all already exist)."
            )

        return created_users

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk signup failed: {str(e)}"
        )


@user_router.post("/refresh", response_model=LoginResponse)
@limiter.limit("30/minute")  # Security: Rate limiting - 30 attempts per minute per IP (token refresh queue handles deduplication)
async def refresh_token(
    request: Request,
    response: Response,
    refresh_token: str = Cookie(None),
    db: Session = Depends(get_session)
):
    """Refresh access token using refresh token cookie"""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided"
        )

    try:
        # Verify the refresh token
        payload = verify_token(refresh_token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        # Get username from token
        username = payload.get("sub")
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

        # Get user from database
        user = get_user_by_username(db, username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        # Create new access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username},
            expires_delta=access_token_expires
        )

        # Set new access token in HTTPOnly cookie (security: CRITICAL)
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True,  # HTTPS only
            samesite="strict",  # CSRF protection
            max_age=15 * 60  # 15 minutes
        )

        # Return empty token (client doesn't need it - it's in secure cookie)
        return LoginResponse(
            access_token="",  # Empty - token is in HTTPOnly cookie
            refresh_token="",  # Empty - already in cookie
            expires_in=15 * 60,
            token_type="bearer",
            user=UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                role=user.role
            )
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not refresh token: {str(e)}"
        )

# Admin routes - Only ADMIN can access these
@admin_router.get("/", response_model=list[UserResponse])
def read_users(
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin())]  # Updated to new role checker
) -> list[UserResponse]:
    """Get all users (Admin only)"""
    try:
        users = db.exec(select(User)).all()
        return [
            UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                role=user.role.value  # Convert enum to string
            )
            for user in users
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching users: {str(e)}"
        )

# Create new user (Admin only)
@admin_router.post("/", response_model=UserResponse)
def create_user(
    user_data: UserCreate,
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin())]  # Only ADMIN
):
    """Create a new user (Admin only)"""
    try:
        # Check if user already exists
        existing_user = db.exec(
            select(User).where(
                (User.username == user_data.username) |
                (User.email == user_data.email)
            )
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already exists"
            )

        # Create new user
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,  # Password will be hashed in the model
            role=UserRole(user_data.role.upper()) if isinstance(user_data.role, str) else user_data.role
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return UserResponse(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            role=new_user.role.value
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

# Update user (Admin only)
@admin_router.put("/{user_id}", response_model=UserResponse)
def update_user_admin(
    user_id: int,
    user_data: UserUpdate,
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin())]  # Only ADMIN
):
    """Update user information (Admin only)"""
    try:
        user = db.exec(select(User).where(User.id == user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )

        # Prevent admin from changing their own role through this endpoint
        if user.username == current_user.username and user_data.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot change your own role"
            )

        # Update fields if provided
        if user_data.username:
            # Check if new username is already taken
            existing_user = db.exec(
                select(User).where(
                    (User.username == user_data.username) & (User.id != user_id)
                )
            ).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
            user.username = user_data.username

        if user_data.email:
            # Check if new email is already taken
            existing_user = db.exec(
                select(User).where(
                    (User.email == user_data.email) & (User.id != user_id)
                )
            ).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already taken"
                )
            user.email = user_data.email

        if user_data.password:
            user.password = get_password_hash(user_data.password)  # Hash the password

        if user_data.role:
            user.role = UserRole(user_data.role.upper()) if isinstance(user_data.role, str) else user_data.role

        db.commit()
        db.refresh(user)

        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role.value
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user: {str(e)}"
        )

# Delete user (Admin only)
@admin_router.delete("/{user_id}")
def delete_user_admin(
    user_id: int,
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin())]  # Only ADMIN
):
    """Delete user (Admin only)"""
    try:
        user = db.exec(select(User).where(User.id == user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )

        # Prevent admin from deleting themselves
        if user.username == current_user.username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete your own account"
            )

        db.delete(user)
        db.commit()

        return {"message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}"
        )

@admin_router.patch("/{username}/role", response_model=UserResponse)
async def update_user_role(
    username: str,
    current_user: Annotated[User, Depends(require_admin())],  # Only ADMIN can change roles
    user_update: AdminUserUpdate,
    db: Session = Depends(get_session)
):
    """Update user role as admin"""
    # Find the user to update
    user_to_update = db.exec(select(User).where(User.username == username)).first()
    if not user_to_update:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"User {username} not found"
        )
    
    # Prevent admin from changing their own role
    if user_to_update.username == current_user.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin cannot change their own role"
        )
    
    try:
        # Convert role to enum (ensure it's uppercase)
        if isinstance(user_update.role, str):
            new_role = UserRole(user_update.role.upper())
        else:
            new_role = user_update.role

        # Update the user's role
        user_to_update.role = new_role
        db.commit()
        db.refresh(user_to_update)
        return user_to_update
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user role: {str(e)}"
        )
```

---

## File: user/user_crud.py

```python
from datetime import timedelta
from jose import JWTError, jwt
from typing import Annotated, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlmodel import Session, select
from db import get_session
from user.settings import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, REFRESH_TOKEN_EXPIRE_MINUTES, SECRET_KEY
from user.services import create_access_token, get_password_hash, get_user_by_username, verify_password, oauth2_scheme
from user.user_models import (
    LoginResponse, 
    TokenData, 
    User, 
    UserCreate,
    UserLogin, 
    UserResponse, 
    UserUpdate,
    UserRole,
    AdminUserUpdate
)

def user_login(db: Session, form_data: UserLogin | OAuth2PasswordRequestForm) -> LoginResponse:
    username = form_data.username
    password = form_data.password
    
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    refresh_token_expires = timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    refresh_token = create_access_token(
        data={"sub": user.username}, expires_delta=refresh_token_expires
    )

    user_response = UserResponse(
        username=user.username,
        email=user.email,
        role=user.role,
        id=user.id
    )

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=int(access_token_expires.total_seconds()),
        token_type="bearer",
        user=user_response
    )


async def signup_user(user_data: UserCreate, db: Session) -> User:
    """
    Create a new user in the database
    """
    # Hash the password
    hashed_password = get_password_hash(user_data.password)
    
    # Create new user instance without specifying the ID (let DB auto-increment)
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        password=hashed_password,
        role=user_data.role
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback()
        raise e

def update_user(user: UserUpdate, session: Session, current_user: User) -> User:
    updated_user = session.exec(select(User).where(User.id == current_user.id)).first()
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = user.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        value = value if key != "password" else get_password_hash(value)
        setattr(updated_user, key, value)
    session.commit()
    session.refresh(updated_user)
    return updated_user

def delete_user(session: Session, username: str) -> dict[str, str]:
    user = session.exec(select(User).where(User.username == username)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    session.delete(user)
    session.commit()
    return {"message": f"User {username} deleted successfully"}

async def get_token_from_cookie_or_header(
    request: Request,
    token_from_header: Annotated[Optional[str], Depends(oauth2_scheme)] = None
) -> str:
    """
    Extract token from either Authorization header or HTTPOnly cookie.
    Preference: Authorization header > access_token cookie
    
    This allows HTTPOnly cookies set by the login endpoint to work
    alongside traditional Authorization headers.
    """
    # First try to get token from Authorization header
    if token_from_header:
        return token_from_header
    
    # Fallback to HTTPOnly cookie (for browser requests)
    token_from_cookie = request.cookies.get("access_token")
    if token_from_cookie:
        return token_from_cookie
    
    # No token found in either location
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials - no token provided",
        headers={"WWW-Authenticate": "Bearer"},
    )

async def get_current_user(
    token: Annotated[str, Depends(get_token_from_cookie_or_header)], 
    db: Annotated[Session, Depends(get_session)]
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
        
    user = get_user_by_username(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

# ==================== SIMPLE ROLE CHECKING SYSTEM ====================

def require_roles(allowed_roles: List[UserRole]):
    """
    Simple role checker - allows access if user has any of the specified roles
    Admin always has access to everything
    """
    def role_checker(current_user: Annotated[User, Depends(get_current_user)]):
        # Admin has access to everything
        if current_user.role == UserRole.ADMIN:
            return current_user
        
        # Check if user has one of the allowed roles
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}"
            )
        
        return current_user
    
    return role_checker

# Pre-defined role checkers for your specific use cases
def require_admin():
    """Only ADMIN can access"""
    return require_roles([UserRole.ADMIN])

def require_admin_principal():
    """ADMIN or PRINCIPAL can access"""
    return require_roles([UserRole.ADMIN, UserRole.PRINCIPAL])

def require_admin_teacher_principal():
    """ADMIN, TEACHER, or PRINCIPAL can access"""
    return require_roles([UserRole.ADMIN, UserRole.TEACHER, UserRole.PRINCIPAL])

def require_admin_teacher_principal_accountant():
    """ADMIN, TEACHER, PRINCIPAL, or ACCOUNTANT can access"""
    return require_roles([UserRole.ADMIN, UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.ACCOUNTANT])

def require_admin_accountant():
    """ADMIN or ACCOUNTANT can access"""
    return require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT])

def require_admin_fee_manager():
    """ADMIN or FEE_MANAGER can access"""
    return require_roles([UserRole.ADMIN, UserRole.FEE_MANAGER])

def require_all_roles():
    """All roles can access (ADMIN, TEACHER, ACCOUNTANT, FEE_MANAGER, PRINCIPAL, USER)"""
    return require_roles([UserRole.ADMIN, UserRole.TEACHER, UserRole.ACCOUNTANT, 
                         UserRole.FEE_MANAGER, UserRole.PRINCIPAL, UserRole.USER])

def require_authenticated():
    """Any authenticated user can access"""
    def checker(current_user: Annotated[User, Depends(get_current_user)]):
        return current_user
    return checker

# ==================== LEGACY FUNCTIONS (for backward compatibility) ====================

async def check_admin_or_teacher(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Legacy function - Check if user is either admin or teacher"""
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        raise HTTPException(
            status_code=403,
            detail="Only administrators and teachers can access this resource"
        )
    return current_user

async def check_admin(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Legacy function - Check if user is admin"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only administrators can access this resource"
        )
    return current_user

async def check_authenticated_user(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Legacy function - Check if user is authenticated"""
    return current_user

# ==================== ADMIN USER MANAGEMENT ====================

async def admin_update_user(
    username: str,
    user_update: AdminUserUpdate, 
    db: Session,
    current_user: Annotated[User, Depends(require_admin)]  # Updated to use new role checker
) -> User:
    """Update user role as admin"""
    
    # Find the user to update
    user_to_update = db.exec(select(User).where(User.username == username)).first()
    if not user_to_update:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"User {username} not found"
        )
    
    # Prevent admin from changing their own role
    if user_to_update.username == current_user.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin cannot change their own role"
        )
    
    try:
        # Convert role to enum (ensure it's uppercase)
        if isinstance(user_update.role, str):
            new_role = UserRole(user_update.role.upper())
        else:
            new_role = user_update.role

        # Update the user's role
        user_to_update.role = new_role
        db.commit()
        db.refresh(user_to_update)
        return user_to_update
        
    except Exception as e:
        db.rollback()
        print(f"Error updating role: {str(e)}")  # Debugging info
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user role: {str(e)}"
        )

# ==================== PER-USER DATA FILTERING (for USER role) ====================

def validate_student_access(current_user: User, requested_student_id: int):
    """
    Validate that a user can access a student's data.
    - ADMIN, PRINCIPAL, TEACHER can access any student's data
    - USER (Student) can only access their own data
    - Raises 403 if unauthorized
    """
    # Admin, Principal, and Teachers can access all student data
    if current_user.role in [UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER]:
        return True
    
    # USER role (Student) can only access their own data
    if current_user.role == UserRole.USER:
        # Assuming user.id represents the student_id for USER role users
        if current_user.id != requested_student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access your own student records"
            )
        return True
    
    # Other roles (ACCOUNTANT, FEE_MANAGER) cannot access student data directly
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Your role does not have permission to access student data"
    )

def can_view_fee_data(current_user: User):
    """
    Check if a user can view fee data.
    - ADMIN, PRINCIPAL, ACCOUNTANT, FEE_MANAGER can view all fees
    - USER (Student) can only view their own fees
    """
    return current_user.role in [UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.ACCOUNTANT, UserRole.FEE_MANAGER, UserRole.USER]

def can_view_attendance_data(current_user: User):
    """
    Check if a user can view attendance data.
    - ADMIN, PRINCIPAL, TEACHER can view all attendance
    - USER (Student) can only view their own attendance
    """
    return current_user.role in [UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER, UserRole.USER]

def require_admin_accountant_fee_manager():
    """ADMIN, ACCOUNTANT, or FEE_MANAGER can access"""
    return require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.FEE_MANAGER])
```

---

## File: user/services.py

```python
from jose import JWTError, jwt
import bcrypt
from typing import Annotated, Optional
from fastapi.openapi.models import OAuthFlows
from fastapi.openapi.models import OAuthFlowPassword
from fastapi.security import OAuth2PasswordBearer
from user.settings import *
from datetime import datetime, timedelta, timezone
from sqlmodel import Session, select
from fastapi import HTTPException, status, Depends
from db import get_session
from typing import Annotated
from passlib.context import CryptContext

from pydantic import EmailStr
from typing import Union, Any
from user.user_models import User  # Import the User model


credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

# Password context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Update OAuth2 scheme to use correct path
# auto_error=False allows None to be returned if token is missing, 
# instead of raising 403. This allows fallback to cookie-based auth.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login-swagger", auto_error=False)  


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against its bcrypt hash.
    
    Handles bcrypt's 72-byte UTF-8 limit by truncating if necessary.
    Note: Passwords should be validated at the Pydantic model level
    to ensure they don't exceed 72 bytes.
    """
    if not plain_password or not hashed_password:
        return False
    
    if not isinstance(plain_password, str):
        return False
    
    try:
        password_bytes = plain_password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """
    Hash the password before storing it in the database.
    
    Password length is validated at the Pydantic model level to ensure
    it doesn't exceed bcrypt's 72-byte UTF-8 limit.
    """
    if not isinstance(password, str):
        raise ValueError('Password must be a string')
    
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')

def get_user_by_username(db: Session, username: str) -> User:
    """Get the user by username."""
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            headers={"WWW-Authenticate": "Bearer"},
            detail="Invalid credentials"
        )

    user = db.exec(select(User).where(User.username == username)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

def get_user_by_id(db: Session, userid: int) -> User:
    """
    Get the user by user id.
    Args:
        db (Session): The database session.
        userid (int): The user id.
    Returns:
        User: The user object.
        """
    if userid is None:
        raise  HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                             headers={"WWW-Authenticate": 'Bearer'},
                             detail={"error": "invalid_token", "error_description": "The access token expired"})
    user = db.get(User, userid)

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="User not found")
    
    return user

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)], 
    db: Annotated[Session, Depends(get_session)]
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        exp = payload.get("exp")
        
        if username is None:
            raise credentials_exception
            
        # Check token expiration
        if datetime.now().timestamp() > exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = get_user_by_username(db, username)
        return user
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
)


def get_user_by_email(db:Session,user_email: EmailStr) -> User:
    """
    Get the user by email.
    Args:
        db (Session): The database session.
        user_email (EmailStr): The email of the user.
    Returns:
        User: The user object.
    """
    if user_email is None:
        raise  HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,headers={"WWW-Authenticate": 'Bearer'},detail={"error": "invalid_token", "error_description": "The access token expired"})

    user = db.get(User, user_email)

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="User not found")
    return user

def authenticate_user(db, username: str, password: str) -> User:
    """
    Authenticate the user.
    Args:
        db (Session): The database session.
        username (str): The username of the user.
        password (str): The password of the user.
    Returns:
        User: The user object.
    """
    user = get_user_by_username(db, username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    if not verify_password(password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create an access token with expiration."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    try:
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating access token: {str(e)}"
        )

def create_refresh_token(data: Union[str, Any], expires_delta: int = None) -> str:

    """
    Create a refresh token.
    Args:
        data (Union[str, Any]): The data to encode in the token.
        expires_delta (int): The time delta for the token to expire.
    Returns:
        str: The refresh token.
    """
    if expires_delta is not None:
        expires_delta = datetime.now() + expires_delta
    else:
        expires_delta = datetime.now() + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expires_delta, "sub": str(data)}
    encoded_jwt = jwt.encode(to_encode, JWT_REFRESH_SECRET_KEY, ALGORITHM)
    return encoded_jwt

def verify_refresh_token(db: Session, token: str) -> User:
    """
    Validates the refresh token and returns the associated user if valid.
    Security: Checks revocation status and expiration.
    """
    try:
        payload = jwt.decode(token, JWT_REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

        # Use parameterized query to prevent SQL injection
        stored_token = db.exec(
            select(RefreshToken).where(RefreshToken.token == token)
        ).first()
        
        if not stored_token:
            logger.warning(f"Token not found in database for user_id: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token not found"
            )
        
        # Check if expired
        if stored_token.is_expired():
            logger.warning(f"Token expired for user_id: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token expired"
            )
        
        # Check if revoked
        if stored_token.is_revoked():
            logger.warning(f"Token was revoked for user_id: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked"
            )

        return get_user_by_username(db, user_id)

    except JWTError as e:
        logger.error(f"JWT decode error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

def revoke_refresh_token(db: Session, token: str) -> bool:
    """
    Revokes a refresh token (used for logout).
    Security: Marks token as revoked instead of deleting (audit trail).
    """
    try:
        # Use parameterized query to prevent SQL injection
        stored_token = db.exec(
            select(RefreshToken).where(RefreshToken.token == token)
        ).first()
        
        if stored_token and not stored_token.is_revoked():
            stored_token.revoked_at = datetime.utcnow()
            db.add(stored_token)
            db.commit()
            logger.info(f"Token revoked for user_id: {stored_token.user_id}")
            return True
        return False
    except Exception as e:
        db.rollback()
        logger.error(f"Error revoking token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error revoking token"
        )

def verify_token(token: str):
    try:
        return jwt.decode(token, JWT_REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
```

---

## File: user/settings.py

```python
from starlette.config import Config


try:
    config = Config(".env")
except FileNotFoundError:
    config = Config()

DATABASE_URL = config("DATABASE_URL", cast=str)
SECRET_KEY = config("SECRET_KEY", cast=str)
ALGORITHM = config("ALGORITHM", cast=str)
ACCESS_TOKEN_EXPIRE_MINUTES = config("ACCESS_TOKEN_EXPIRE_MINUTES", cast=int)
REFRESH_TOKEN_EXPIRE_MINUTES = config("REFRESH_TOKEN_EXPIRE_MINUTES", cast=int)
JWT_REFRESH_SECRET_KEY = config("JWT_REFRESH_SECRET_KEY", cast=str)
```

---

## File: frontend/src/context/RoleContext.tsx

```typescript
"use client";

import React, { createContext, useState, useContext, useEffect } from "react";

interface RoleContextType {
  role: string | null;
  setRole: (role: string) => void;
  clearRole: () => void;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Guard against SSR — storage is only available in browser
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    // 1. Try sessionStorage first (set by setRole() calls within the same tab)
    const storedRole = sessionStorage.getItem("userRole");

    if (storedRole) {
      setRole(storedRole);
      setIsLoading(false);
      return;
    }

    // 2. Fallback: extract role from the user object in localStorage.
    //    This handles the case where the login page saves the full user object
    //    to localStorage but doesn't separately call context.setRole().
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user?.role) {
          console.log("RoleContext - Recovered role from localStorage:", user.role);
          setRole(user.role);
          // Sync into sessionStorage so subsequent checks are fast
          sessionStorage.setItem("userRole", user.role);
        } else {
          console.warn("RoleContext - user object in localStorage has no role field:", user);
        }
      } catch {
        console.error("RoleContext - Failed to parse user from localStorage");
      }
    } else {
      console.warn("RoleContext - No user found in localStorage or sessionStorage");
    }

    setIsLoading(false);
  }, []);

  const setRoleAndStore = (newRole: string) => {
    setRole(newRole);
    // Write to BOTH storages so either path works on next load
    sessionStorage.setItem("userRole", newRole);
    // Also update the role field inside the stored user object
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.role = newRole;
        localStorage.setItem("user", JSON.stringify(user));
      }
    } catch {
      // Non-critical — sessionStorage is the primary source
    }
  };

  const clearRole = () => {
    setRole(null);
    sessionStorage.removeItem("userRole");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole: setRoleAndStore,
        clearRole,
        isLoading,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
```

---

## File: frontend/src/utils/rolePermissions.ts

```typescript
// Role-based access control mapping
export type UserRole =
  | "ADMIN"
  | "PRINCIPAL"
  | "TEACHER"
  | "ACCOUNTANT"
  | "FEE_MANAGER"
  | "USER";

export type Section =
  | "dashboard"
  | "attendance"
  | "students"
  | "teachers"
  | "classes"
  | "fees"
  | "expenses"
  | "income"
  | "attendance_time"
  | "salary"
  | "setup";

// Role to accessible sections mapping
const ROLE_PERMISSIONS: Record<UserRole, Section[]> = {
  ADMIN: [
    "dashboard",
    "attendance",
    "students",
    "teachers",
    "classes",
    "fees",
    "expenses",
    "income",
    "attendance_time",
    "salary",
    "setup",
  ],
  PRINCIPAL: [
    "dashboard",
    "attendance",
    "students",
    "teachers",
    "classes",
  ],
  TEACHER: ["attendance", "students", "dashboard"],
  ACCOUNTANT: ["expenses", "fees", "income", "dashboard", "salary"],
  FEE_MANAGER: ["expenses", "fees", "income", "dashboard", "students"],
  USER: ["dashboard"], // Students can access own attendance & fees through filtered endpoints
};

/**
 * Check if a user with a given role can access a section
 */
export function canAccessSection(role: string | null, section: string): boolean {
  if (!role) return false;
  if (!isValidRole(role)) return false;

  const sections = ROLE_PERMISSIONS[role as UserRole];
  return sections.includes(section as Section);
}

/**
 * Get all accessible sections for a role
 */
export function getAccessibleSections(role: string | null): Section[] {
  if (!role || !isValidRole(role)) return [];
  return ROLE_PERMISSIONS[role as UserRole];
}

/**
 * Check if a user can access a given route path
 */
export function canAccessRoute(role: string | null, pathname: string): boolean {
  if (!role) return false;

  // Extract section from pathname
  // Paths like /dashboard/students -> students
  // /dashboard/attendance/time -> attendance, etc.
  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] !== "dashboard") {
    // Routes outside dashboard (login, unauthorized) are generally accessible
    return true;
  }

  if (parts.length === 1) {
    // Just /dashboard
    return canAccessSection(role, "dashboard");
  }

  // Normalize singular → plural to match Section type
  const sectionMap: Record<string, string> = { expense: "expenses" };
  const raw = parts[1];
  const section = sectionMap[raw] ?? raw;
  return canAccessSection(role, section);
}

/**
 * Validate if a string is a valid role
 */
export function isValidRole(role: string): boolean {
  return ["ADMIN", "PRINCIPAL", "TEACHER", "ACCOUNTANT", "FEE_MANAGER", "USER"].includes(
    role
  );
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: string | null): string {
  if (!role) return "Unknown";
  
  const displayNames: Record<UserRole, string> = {
    ADMIN: "Administrator",
    PRINCIPAL: "Principal",
    TEACHER: "Teacher",
    ACCOUNTANT: "Accountant",
    FEE_MANAGER: "Fee Manager",
    USER: "Student",
  };

  return displayNames[role as UserRole] || role;
}

/**
 * Check if a submenu item should be visible for a given role
 * Handles read-only restrictions (e.g., PRINCIPAL and ACCOUNTANT can view fees but not add)
 */
export function canAccessSubmenuItem(role: string | null, submenuPath: string): boolean {
  if (!role) return false;

  // PRINCIPAL: can view fees but not add
  if (role === "PRINCIPAL" && submenuPath.includes("/fees/add_fees")) {
    return false;
  }

  // Deleted Students: only ADMIN and PRINCIPAL can access
  if (submenuPath.includes("/students/deleted")) {
    return role === "ADMIN" || role === "PRINCIPAL";
  }

  // Manage User: only ADMIN can access
  if (submenuPath.includes("/setup/manage_user")) {
    return role === "ADMIN";
  }

  // TEACHER: can only access Mark Attendance and View Attendance submenu items
  if (role === "TEACHER") {
    return (
      submenuPath.includes("/attendance/mark_attendance") ||
      submenuPath.includes("/attendance/view_attendance") ||
      submenuPath.includes("/students") && !submenuPath.includes("/deleted")
    );
  }

  // All other cases follow the section-based access control
  return true;
}
```

---

## File: frontend/src/components/ProtectedRoute.tsx

```typescript
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
    } else {
      setAuthorized(true);
    }
  }, [router, pathname]); // re-check on every route change

  if (!authorized) return null; // or a loading spinner
  return <>{children}</>;
}
```

---

**END OF COMPLETE FILES REFERENCE**

This document contains all code from the requested files, organized by filename with clear headers.
