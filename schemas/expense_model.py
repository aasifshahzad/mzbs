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
    source_type: Optional[str] = Field(default=None, index=True)
    source_id: Optional[int] = Field(default=None, index=True)

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
    source_type: Optional[str] = None

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
