from datetime import datetime
from sqlmodel import Relationship, SQLModel, Field, Column
from sqlalchemy import String, Integer, DateTime
from typing import List, Optional
from datetime import datetime


# ****************************************************************************************
# Teacher Names


class TeacherNamesBase(SQLModel):
    teacher_name_id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default=datetime.now(), nullable=False)


class TeacherNames(TeacherNamesBase, table=True):
    teacher_name: str = Field(index=True, unique=True)

    # Relationship to Attendance
    attendances: list["Attendance"] = Relationship(
        back_populates="attendance_teacher")

    # Legacy Salary Relationship (keep for backward compatibility)
    salaries: list["Salary"] = Relationship(back_populates="teacher")

    # New Payroll System Relationships
    teacher_salaries: list["TeacherSalary"] = Relationship(back_populates="teacher")
    salary_ledgers: list["SalaryLedger"] = Relationship(back_populates="teacher")
    salary_payments: list["SalaryPayment"] = Relationship(back_populates="teacher")
    allowances: list["Allowance"] = Relationship(back_populates="teacher")
    deductions: list["Deduction"] = Relationship(back_populates="teacher")


class TeacherNamesCreate(SQLModel):
    teacher_name: str = Field(index=True, unique=True)


class TeacherNamesResponse(TeacherNamesBase, SQLModel):
    teacher_name: str
