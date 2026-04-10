from typing import Optional
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from sqlmodel import Session, select
from router.class_names import get_class_name

from schemas.class_names_model import ClassNames
from router.students import get_student_by_id, get_student_details, get_student_details_utility
from sqlalchemy import func
from datetime import datetime
from schemas.fee_model import MONTHS

from db import get_session
from schemas.fee_model import Fee, FeeCreate, FeeResponse, FeeStatus, FeeUpdateRequest, FeeFilter, FilterPaidUnpaid
from user.user_crud import require_admin_accountant_fee_manager
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
    current_user: Annotated[User, Depends(require_admin_accountant_fee_manager())]
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

@fee_router.post("/filter/", response_model=List[FeeResponse])
async def filter_fees(
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_admin_accountant_fee_manager())],
    student_id: Optional[int] = Query(None, description="Filter by student ID"),
    class_id: Optional[int] = Query(None, description="Filter by class ID"),
    fee_month: Optional[str] = Query(None, description="Filter by fee month"),
    fee_year: Optional[str] = Query(None, description="Filter by fee year"),
    fee_status: Optional[str] = Query(None, description="Filter by fee status"),
    skip: int = Query(0, description="Skip records"),
    limit: int = Query(100, description="Limit records per page"),
    sort_by: Optional[str] = Query(None, description="Sort by field")
):
    """Filter student fee records based on provided criteria (Admin only)."""
    try:
        query = select(Fee)
        if student_id:
            query = query.where(Fee.student_id == student_id)
        if class_id:
            query = query.where(Fee.class_id == class_id)
        if fee_month:
            query = query.where(Fee.fee_month == fee_month)
        if fee_year:
            query = query.where(Fee.fee_year == str(fee_year))
        if fee_status:
            query = query.where(Fee.fee_status == fee_status)

        if sort_by:
            if hasattr(Fee, sort_by):
                query = query.order_by(getattr(Fee, sort_by))
                
        query = query.offset(skip).limit(limit)

        fees = db.exec(query).all()

        filtered_response = []
        for fee in fees:
            student_details = get_student_details_utility(db, fee.student_id)
            class_name = get_class_name(db, fee.class_id)

            filtered_response.append(
                FeeResponse(
                    fee_id=fee.fee_id,
                    created_at=fee.created_at,
                    student_name=student_details["student_name"] if student_details else None,
                    father_name=student_details["father_name"] if student_details else None,
                    class_name=class_name,
                    fee_amount=fee.fee_amount,
                    fee_month=fee.fee_month,
                    fee_year=str(fee.fee_year),
                    fee_status=fee.fee_status
                )
            )
        
        return filtered_response
    except Exception as e:
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
                    student_id=student.student_id,
                    student_name=student.student_name,
                    father_name=student.father_name,
                    class_name=class_name,
                    fee_status=FeeStatus.UNPAID,
                    fee_month=fee_month if fee_month else "N/A",
                    fee_year=str(fee_year) if fee_year else "N/A",
                    fee_amount=0.0
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
                        student_id=student.student_id,
                        student_name=student.student_name,
                        father_name=student.father_name,
                        class_name=class_name,
                        fee_status=FeeStatus.UNPAID,
                        fee_month=fee_month or "N/A",
                        fee_year=str(fee_year) if fee_year else "N/A",
                        fee_amount=0.0
                    )
                )
        
        return response_list

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching class fee status: {str(e)}"
        )