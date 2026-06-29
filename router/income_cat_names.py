from asyncio.log import logger
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError  # <-- Add this import

from db import get_session

from schemas.income_cat_names_model import IncomeCatNames, IncomeCatNamesCreate, IncomeCatNamesResponse
from user.user_crud import require_admin_accountant_fee_manager
from user.user_models import User
from schemas.income_model import Income  # <-- Add this import

income_cat_names_router = APIRouter(
    prefix="/income_cat_names",
    tags=["Income Category Names"],
    responses={404: {"Description": "Not found"}}
)


@income_cat_names_router.get("/", response_model=dict)
async def root():
    return {"message": "MMS-General service is running", "status": "Income Category Names Router Page running :-)"}


@income_cat_names_router.post("/add_income_cat_name/", response_model=IncomeCatNamesResponse)
def create_income_cat_name( user: Annotated[User, Depends(require_admin_accountant_fee_manager())], income_cat_name: IncomeCatNamesCreate, session: Session = Depends(get_session),):
    db_income_cat_name = IncomeCatNames(**income_cat_name.model_dump())
    session.add(db_income_cat_name)

    try:
        session.commit()
        session.refresh(db_income_cat_name)
    # sqlmodel uses SQLAlchemy exceptions for integrity errors
    except IntegrityError as e:
        session.rollback()
        logger.error(f"Integrity error: {e}")
        # Check if it's a duplicate category name or primary key
        if "unique constraint" in str(e.orig).lower() or "duplicate key" in str(e.orig).lower():
            raise HTTPException(
                status_code=400, detail="Income category name or ID must be unique."
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

    return db_income_cat_name




@income_cat_names_router.get("/income-cat-names-all/", response_model=List[IncomeCatNamesResponse])
def read_income_cat_names(current_user: Annotated[User, Depends(require_admin_accountant_fee_manager())], session: Session = Depends(get_session)):
    income_cat_names = session.exec(select(IncomeCatNames)).all()
    return income_cat_names




@income_cat_names_router.get("/{income_cat_id}", response_model=IncomeCatNamesResponse)
def read_income_cat_name(current_user: Annotated[User, Depends(require_admin_accountant_fee_manager())], income_cat_id: int, session: Session = Depends(get_session)):
    income_cat_name = session.get(IncomeCatNames, income_cat_id)
    if not income_cat_name:
        raise HTTPException(
            status_code=404, detail="Income category name not found")
    return income_cat_name


@income_cat_names_router.delete("/del/{income_cat_id}", response_model=dict)
def delete_income_cat_name(user: Annotated[User, Depends(require_admin_accountant_fee_manager())], income_cat_id: int, session: Session = Depends(get_session)):
    income_cat_name = session.get(IncomeCatNames, income_cat_id)
    if not income_cat_name:
        raise HTTPException(
            status_code=404, detail="Income category name not found")
    # Check for related income records
    related_incomes = session.exec(select(Income).where(Income.category_id == income_cat_id)).first()
    if related_incomes:
        raise HTTPException(
            status_code=409,
            detail="Please delete related income records first before deleting this category."
        )
    session.delete(income_cat_name)
    session.commit()
    return {"message": "Income Category Name deleted successfully"}
