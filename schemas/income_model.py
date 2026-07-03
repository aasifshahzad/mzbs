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
    source_type: Optional[str] = Field(default=None, index=True)
    source_id: Optional[int] = Field(default=None, index=True)

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
    source_type: Optional[str] = None

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