from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import DateTime


class StudentParentCredential(SQLModel, table=True):
    student_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        foreign_key="students.student_id",
    )
    parent_name: Optional[str] = Field(default=None)
    parent_mobile: Optional[str] = Field(default=None)
    password_hash: str = Field(nullable=False)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime))
