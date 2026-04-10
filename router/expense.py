from typing import List, Annotated, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException

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

@expense_router.get("/expenses-all/", response_model=List[ExpenseResponse])
def read_expenses(user: Annotated[User, Depends(require_admin_accountant())], session: Session = Depends(get_session)):
    expenses = session.exec(select(Expense)).all()
    # Map category to its string representation
    return [
        ExpenseResponse(
            id=expense.id,
            created_at=expense.created_at,
            recipt_number=expense.recipt_number,
            date=expense.date,
            category=expense.category.expense_cat_name if expense.category else None,
            to_whom=expense.to_whom,
            description=expense.description,
            amount=expense.amount,
        )
        for expense in expenses
    ]

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

@expense_router.get("/filter-by-category/{category_id}", response_model=List[ExpenseResponse])
def filter_expense_by_category(
    category_id: int,
    user: Annotated[User, Depends(require_admin_accountant())],
    session: Session = Depends(get_session),
):
    """Compatibility endpoint for older frontend callers (/filter-by-category/{id})."""
    try:
        if category_id == 0:
            expenses = session.exec(select(Expense)).all()
        else:
            expenses = session.exec(
                select(Expense).where(Expense.category_id == category_id)
            ).all()

        if not expenses:
            return []

        result = []
        for expense in expenses:
            category = session.get(ExpenseCatNames, expense.category_id)
            result.append(
                ExpenseResponse(
                    id=expense.id,
                    created_at=expense.created_at or datetime.utcnow(),
                    recipt_number=expense.recipt_number,
                    date=expense.date,
                    category=category.expense_cat_name if category else None,
                    to_whom=expense.to_whom,
                    description=expense.description,
                    amount=expense.amount,
                )
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error filtering expense records: {str(e)}")