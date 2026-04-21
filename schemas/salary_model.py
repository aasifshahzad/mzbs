from datetime import datetime
from decimal import Decimal
from sqlmodel import Relationship, SQLModel, Field, UniqueConstraint
from typing import Optional


# ============================================================================
# TEACHER SALARY SYSTEM - PRODUCTION GRADE PAYROLL LEDGER
# ============================================================================

# ============================================================================
# 1. TEACHER SALARY (Base Salary Configuration)
# ============================================================================

class TeacherSalaryBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: int = Field(foreign_key="teachernames.teacher_name_id", nullable=False)
    base_salary: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    effective_from: str = Field(nullable=False)  # YYYY-MM-DD format
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)


class TeacherSalary(TeacherSalaryBase, table=True):
    __tablename__ = "teacher_salary"

    # Relationship to TeacherNames
    teacher: Optional["TeacherNames"] = Relationship(back_populates="teacher_salaries")


class TeacherSalaryCreate(SQLModel):
    teacher_id: int
    base_salary: Decimal
    effective_from: str


class TeacherSalaryUpdate(SQLModel):
    base_salary: Optional[Decimal] = None
    effective_from: Optional[str] = None


class TeacherSalaryResponse(TeacherSalaryBase, SQLModel):
    teacher_name: Optional[str] = None


# ============================================================================
# 2. SALARY LEDGER (Monthly Records - HEART OF SYSTEM)
# ============================================================================

class SalaryLedgerBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: int = Field(foreign_key="teachernames.teacher_name_id", nullable=False)
    month: int = Field(ge=1, le=12, nullable=False)  # 1-12
    year: int = Field(nullable=False)  # e.g. 2026
    base_salary: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    allowance_total: Decimal = Field(max_digits=10, decimal_places=2, default=0)
    deduction_total: Decimal = Field(max_digits=10, decimal_places=2, default=0)
    net_salary: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    total_paid: Decimal = Field(max_digits=10, decimal_places=2, default=0)
    remaining: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)


class SalaryLedger(SalaryLedgerBase, table=True):
    __tablename__ = "salary_ledger"

    # Unique constraint to prevent duplicate ledger entries per teacher/month/year
    __table_args__ = (
        UniqueConstraint('teacher_id', 'month', 'year', name='unique_teacher_month_year'),
    )

    # Relationships
    teacher: Optional["TeacherNames"] = Relationship(back_populates="salary_ledgers")
    payments: list["SalaryPayment"] = Relationship(back_populates="ledger")


class SalaryLedgerCreate(SQLModel):
    teacher_id: int
    month: int
    year: int
    base_salary: Decimal
    allowance_total: Optional[Decimal] = 0
    deduction_total: Optional[Decimal] = 0
    net_salary: Decimal
    total_paid: Optional[Decimal] = 0
    remaining: Decimal


class SalaryLedgerUpdate(SQLModel):
    allowance_total: Optional[Decimal] = None
    deduction_total: Optional[Decimal] = None
    net_salary: Optional[Decimal] = None
    total_paid: Optional[Decimal] = None
    remaining: Optional[Decimal] = None


class SalaryLedgerResponse(SalaryLedgerBase, SQLModel):
    teacher_name: Optional[str] = None


# ============================================================================
# 3. SALARY PAYMENT (Transaction Records)
# ============================================================================

class SalaryPaymentBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: int = Field(foreign_key="teachernames.teacher_name_id", nullable=False)
    ledger_id: int = Field(foreign_key="salary_ledger.id", nullable=False)
    amount: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    payment_date: str = Field(nullable=False)  # YYYY-MM-DD format
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)


class SalaryPayment(SalaryPaymentBase, table=True):
    __tablename__ = "salary_payment"

    # Relationships
    teacher: Optional["TeacherNames"] = Relationship(back_populates="salary_payments")
    ledger: Optional[SalaryLedger] = Relationship(back_populates="payments")


class SalaryPaymentCreate(SQLModel):
    teacher_id: int
    ledger_id: int
    amount: Decimal
    payment_date: str


class SalaryPaymentResponse(SalaryPaymentBase, SQLModel):
    teacher_name: Optional[str] = None


# ============================================================================
# 4. ALLOWANCE (Monthly Allowances)
# ============================================================================

class AllowanceBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: int = Field(foreign_key="teachernames.teacher_name_id", nullable=False)
    month: int = Field(ge=1, le=12, nullable=False)
    year: int = Field(nullable=False)
    amount: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    reason: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)


class Allowance(AllowanceBase, table=True):
    __tablename__ = "allowance"

    # Relationship to TeacherNames
    teacher: Optional["TeacherNames"] = Relationship(back_populates="allowances")


class AllowanceCreate(SQLModel):
    teacher_id: int
    month: int
    year: int
    amount: Decimal
    reason: Optional[str] = None


class AllowanceResponse(AllowanceBase, SQLModel):
    teacher_name: Optional[str] = None


# ============================================================================
# 5. DEDUCTION (Monthly Deductions)
# ============================================================================

class DeductionBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: int = Field(foreign_key="teachernames.teacher_name_id", nullable=False)
    month: int = Field(ge=1, le=12, nullable=False)
    year: int = Field(nullable=False)
    amount: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    type: str = Field(max_length=50, nullable=False)  # late/leave/loan/etc
    reason: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)


class Deduction(DeductionBase, table=True):
    __tablename__ = "deduction"

    # Relationship to TeacherNames
    teacher: Optional["TeacherNames"] = Relationship(back_populates="deductions")


class DeductionCreate(SQLModel):
    teacher_id: int
    month: int
    year: int
    amount: Decimal
    type: str
    reason: Optional[str] = None


class DeductionResponse(DeductionBase, SQLModel):
    teacher_name: Optional[str] = None


# ============================================================================
# LEGACY TABLES (Keep for backward compatibility during migration)
# ============================================================================

class SalaryBase(SQLModel):
    salary_id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)


class Salary(SalaryBase, table=True):
    """Legacy table - kept for backward compatibility during migration"""
    teacher_id: int = Field(foreign_key="teachernames.teacher_name_id", nullable=False)
    monthly_salary: Decimal = Field(nullable=False)
    effective_date: str = Field(nullable=False)

    # Relationship to TeacherNames
    teacher: Optional["TeacherNames"] = Relationship(back_populates="salaries")  # type: ignore


class SalaryCreate(SQLModel):
    teacher_id: int
    monthly_salary: Decimal
    effective_date: str


class SalaryUpdate(SQLModel):
    monthly_salary: Optional[Decimal] = None
    effective_date: Optional[str] = None


class SalaryResponse(SalaryBase, SQLModel):
    teacher_id: int
    teacher_name: Optional[str] = None
    monthly_salary: Decimal
    effective_date: str
