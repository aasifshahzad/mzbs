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
    fees = db.exec(select(Fee)).all()
    
    response_list = []
    for fee in fees:
        student = await get_student_by_id(db, fee.student_id)
        class_name = db.exec(
            select(ClassNames)
            .where(ClassNames.class_name_id == fee.class_id)
        ).first()
        
        response = FeeResponse(
            fee_id=fee.fee_id,
            created_at=fee.created_at,
            student_name=student.student_name if student else None,
            father_name=student.father_name if student else None,
            class_name=class_name.class_name if class_name else None,
            fee_amount=fee.fee_amount,
            fee_month=fee.fee_month,
            fee_year=str(fee.fee_year),
            fee_status=fee.fee_status
        )
        response_list.append(response)
    
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

@fee_router.post("/filter/", response_model=List[FilterPaidUnpaid])
async def filter_fees(
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin_accountant_fee_manager())],
    class_id: Optional[int] = Query(None, description="Filter by class ID"),
    fee_month: Optional[str] = Query(None, description="Filter by fee month"),
    fee_year: Optional[str] = Query(None, description="Filter by fee year"),
    fee_status: Optional[str] = Query(None, description="Filter by fee status"),
    skip: int = Query(0, description="Skip records"),
    limit: int = Query(100, description="Limit records per page"),
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

        # ── Sort by class name ────────────────────────────────────────────────
        filtered_response.sort(key=lambda x: x.class_name)
        
        # ── Pagination ────────────────────────────────────────────────────────
        filtered_response = filtered_response[skip:skip + limit]
        return filtered_response
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
