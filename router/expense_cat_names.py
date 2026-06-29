from asyncio.log import logger
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError  # <-- Add this import

from db import get_session
from utils.cache import cache_get, cache_set, cache_invalidate

from schemas.expense_cat_names_model import ExpenseCatNames, ExpenseCatNamesCreate, ExpenseCatNamesResponse
from user.user_crud import require_admin_accountant_fee_manager
from user.user_models import User
from schemas.expense_model import Expense  # <-- Add this import

expense_cat_names_router = APIRouter(
    prefix="/expense_cat_names",
    tags=["Expense Category Names"],
    responses={404: {"Description": "Not found"}}
)


@expense_cat_names_router.get("/", response_model=dict)
async def root():
    return {"message": "MMS-General service is running", "status": "expense Category Names Router Page running :-)"}

@expense_cat_names_router.post("/add_expense_cat_name/", response_model=ExpenseCatNamesResponse)
def create_expense_cat_name( 
    user: Annotated[User, Depends(require_admin_accountant_fee_manager())],
    expense_cat_name: ExpenseCatNamesCreate, session: Session = Depends(get_session),):
    db_expense_cat_name = ExpenseCatNames(**expense_cat_name.model_dump())
    session.add(db_expense_cat_name)

    try:
        session.commit()
        session.refresh(db_expense_cat_name)
        cache_invalidate("expense_cats")
    except IntegrityError as e:
        session.rollback()
        logger.error(f"Integrity error: {e}")
        if "unique constraint" in str(e.orig).lower() or "duplicate key" in str(e.orig).lower():
            raise HTTPException(
                status_code=400, detail="Expense category name or ID must be unique."
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

    return db_expense_cat_name

@expense_cat_names_router.get("/expense-cat-names-all/", response_model=List[ExpenseCatNamesResponse])
def read_expense_cat_names(
    user: Annotated[User, Depends(require_admin_accountant_fee_manager())],
    session: Session = Depends(get_session)
):
    cached = cache_get("expense_cats")
    if cached is not None:
        return cached
    expense_cat_names = session.exec(select(ExpenseCatNames)).all()
    result = [ExpenseCatNamesResponse.model_validate(c) for c in expense_cat_names]
    cache_set("expense_cats", result)
    return result

@expense_cat_names_router.get("/{expense_cat_id}", response_model=ExpenseCatNamesResponse)
def read_expense_cat_name(
    user: Annotated[User, Depends(require_admin_accountant_fee_manager())],
    expense_cat_id: int, session: Session = Depends(get_session)):
    expense_cat_name = session.get(ExpenseCatNames, expense_cat_id)
    if not expense_cat_name:
        raise HTTPException(
            status_code=404, detail="expense category name not found")
    return expense_cat_name

@expense_cat_names_router.delete("/del/{expense_cat_id}", response_model=dict)
def delete_expense_cat_name(
    user: Annotated[User, Depends(require_admin_accountant_fee_manager())],
    expense_cat_id: int, session: Session = Depends(get_session)):
    expense_cat_name = session.get(ExpenseCatNames, expense_cat_id)
    if not expense_cat_name:
        raise HTTPException(
            status_code=404, detail="Expense category name not found")
    # Check for related expense records
    related_expenses = session.exec(select(Expense).where(Expense.category_id == expense_cat_id)).first()
    if related_expenses:
        raise HTTPException(
            status_code=409,
            detail="Please delete related expense records first before deleting this category."
        )
    session.delete(expense_cat_name)
    session.commit()
    cache_invalidate("expense_cats")
    return {"message": "Expense Category Name deleted successfully"}
