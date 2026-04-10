from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
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

@income_router.get("/all", response_model=List[IncomeResponse])
def get_all_incomes(
    session: Session = Depends(get_session),
    user: User = Depends(require_admin_accountant())
):
    """Get all income records."""
    try:
        # Query to get all income records
        incomes = session.query(Income).all()

        # Prepare the response
        response = []
        for income in incomes:
            category = session.get(IncomeCatNames, income.category_id)
            response.append(
                IncomeResponse(
                    id=income.id,  # type: ignore
                    created_at=income.created_at or datetime.utcnow(),  # Ensure created_at is not None
                    recipt_number=income.recipt_number,
                    date=income.date,  # type: ignore
                    category=category.income_cat_name if category else None,  # Convert category to string
                    source=income.source,
                    description=income.description,
                    contact=income.contact,
                    amount=income.amount
                )
            )
        
        return response
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
        recipt_number=db_income.recipt_number,
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
        recipt_number=db_income.recipt_number,
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

@income_router.get("/filter_income", response_model=List[IncomeResponse])
def filter_income(
    category_id: Optional[int] = None,
    session: Session = Depends(get_session),
    user: User = Depends(require_admin_accountant())
):
    """Filter income records by category_id, or return all if None or 0."""
    try:
        # Return all when category_id is omitted or 0 (frontend uses 0 for "All")
        if category_id is None or category_id == 0:
            incomes = session.query(Income).all()
        else:
            incomes = session.query(Income).filter(Income.category_id == category_id).all()

        # Prepare the response
        filtered_response = []
        for income in incomes:
            category = session.get(IncomeCatNames, income.category_id)
            filtered_response.append(
                IncomeResponse(
                    id=income.id,  # type: ignore
                    created_at=income.created_at or datetime.utcnow(),
                    recipt_number=income.recipt_number,
                    date=income.date,  # type: ignore
                    category=category.income_cat_name if category else None,
                    source=income.source,
                    description=income.description,
                    contact=income.contact,
                    amount=income.amount
                )
            )
        
        return filtered_response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error filtering income records: {str(e)}"
        )


# @income_router.get("/filter_income", response_model=List[IncomeResponse])
# def filter_income(
#     category_id: Optional[int] = None,   # <-- make it optional
#     session: Session = Depends(get_session),
#     user: User = Depends(require_admin_accountant())
# ):
#     """Filter income records by category_id, or return all if None."""
#     try:
#         if category_id is None:  # <-- if no category_id passed, fetch all
#             incomes = session.query(Income).all()
#         else:
#             incomes = session.query(Income).filter(Income.category_id == category_id).all()

#         # Prepare the response
#         response = []
#         for income in incomes:
#             category = session.get(IncomeCatNames, income.category_id)
#             response.append(
#                 IncomeResponse(
#                     id=income.id,  # type: ignore
#                     created_at=income.created_at or datetime.utcnow(),
#                     recipt_number=income.recipt_number,
#                     date=income.date,  # type: ignore
#                     category=category.income_cat_name if category else None,
#                     source=income.source,
#                     description=income.description,
#                     contact=income.contact,
#                     amount=income.amount
#                 )
#             )

#         return response
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error filtering income records: {str(e)}"
#         )
