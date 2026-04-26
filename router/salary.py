from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, delete
from typing import List, Annotated

from db import get_session
from schemas.salary_model import (
    TeacherSalary, TeacherSalaryCreate, TeacherSalaryResponse, TeacherSalaryUpdate,
    SalaryLedger, SalaryLedgerCreate, SalaryLedgerResponse, SalaryLedgerUpdate,
    SalaryPayment, SalaryPaymentCreate, SalaryPaymentResponse, SalaryPaymentUpdate,
    Allowance, AllowanceCreate, AllowanceResponse, AllowanceUpdate,
    Deduction, DeductionCreate, DeductionResponse, DeductionUpdate
)
from schemas.teacher_names_model import TeacherNames
from user.user_crud import require_admin_accountant, require_admin
from user.user_models import User


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def ensure_salary_ledger_exists(
    db: Session,
    teacher_id: int,
    month: int,
    year: int
) -> SalaryLedger:
    """
    Ensure a salary ledger exists for the given teacher/month/year.
    If it doesn't exist, create it using the teacher's current base salary.
    """
    # Check if ledger already exists
    existing_ledger = db.exec(
        select(SalaryLedger)
        .where(
            SalaryLedger.teacher_id == teacher_id,
            SalaryLedger.month == month,
            SalaryLedger.year == year
        )
    ).first()

    if existing_ledger:
        return existing_ledger

    # Get teacher's current base salary
    teacher_salary = db.exec(
        select(TeacherSalary)
        .where(TeacherSalary.teacher_id == teacher_id)
        .order_by(TeacherSalary.effective_from.desc())
    ).first()

    if not teacher_salary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No base salary configured for teacher ID {teacher_id}"
        )

    # Create new ledger entry
    base_salary = teacher_salary.base_salary
    new_ledger = SalaryLedger(
        teacher_id=teacher_id,
        month=month,
        year=year,
        base_salary=base_salary,
        allowance_total=0,
        deduction_total=0,
        net_salary=base_salary,  # Initially net = base (allowances/deductions will adjust)
        total_paid=0,
        remaining=base_salary
    )

    db.add(new_ledger)
    db.commit()
    db.refresh(new_ledger)

    return new_ledger


def recalculate_ledger_totals(
    db: Session,
    teacher_id: int,
    month: int,
    year: int
) -> SalaryLedger:
    """
    Recalculate and update the totals for a salary ledger based on actual allowances,
    deductions, and payments for the given teacher/month/year.
    """
    # Get or create the ledger
    ledger = ensure_salary_ledger_exists(db, teacher_id, month, year)

    # Calculate total allowances
    total_allowances = db.exec(
        select(Allowance.amount)
        .where(
            Allowance.teacher_id == teacher_id,
            Allowance.month == month,
            Allowance.year == year
        )
    ).all()
    allowance_total = sum(total_allowances)

    # Calculate total deductions
    total_deductions = db.exec(
        select(Deduction.amount)
        .where(
            Deduction.teacher_id == teacher_id,
            Deduction.month == month,
            Deduction.year == year
        )
    ).all()
    deduction_total = sum(total_deductions)

    # Calculate total payments
    total_payments = db.exec(
        select(SalaryPayment.amount)
        .where(
            SalaryPayment.teacher_id == teacher_id,
            SalaryPayment.ledger_id == ledger.id
        )
    ).all()
    total_paid = sum(total_payments)

    # Update ledger with recalculated totals
    ledger.allowance_total = allowance_total
    ledger.deduction_total = deduction_total
    ledger.total_paid = total_paid
    ledger.net_salary = ledger.base_salary + allowance_total - deduction_total
    ledger.remaining = ledger.net_salary - total_paid

    db.add(ledger)
    db.commit()
    db.refresh(ledger)

    return ledger


salary_router = APIRouter(
    prefix="/salary",
    tags=["Salary"],
    responses={404: {"Description": "Not found"}}
)


# ============================================================================
# TEACHER SALARY MANAGEMENT (Base Salary Configuration)
# ============================================================================

@salary_router.get("/teacher-salary/all", response_model=List[TeacherSalaryResponse])
def get_all_teacher_salaries(
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())]
):
    """Get all teacher salary configurations."""
    try:
        salaries = db.exec(select(TeacherSalary)).all()

        response = []
        for salary in salaries:
            teacher = db.exec(
                select(TeacherNames)
                .where(TeacherNames.teacher_name_id == salary.teacher_id)
            ).first()

            response.append(
                TeacherSalaryResponse(
                    id=salary.id,
                    teacher_id=salary.teacher_id,
                    teacher_name=teacher.teacher_name if teacher else None,
                    base_salary=salary.base_salary,
                    effective_from=salary.effective_from,
                    created_at=salary.created_at
                )
            )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching teacher salaries: {str(e)}"
        )


@salary_router.post("/teacher-salary/add", response_model=TeacherSalaryResponse, status_code=status.HTTP_201_CREATED)
def create_teacher_salary(
    salary_data: TeacherSalaryCreate,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())]
):
    """Create a new teacher salary configuration."""
    try:
        # Verify teacher exists
        teacher = db.exec(
            select(TeacherNames)
            .where(TeacherNames.teacher_name_id == salary_data.teacher_id)
        ).first()

        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {salary_data.teacher_id} not found"
            )

        # Create new teacher salary record
        new_salary = TeacherSalary(
            teacher_id=salary_data.teacher_id,
            base_salary=salary_data.base_salary,
            effective_from=salary_data.effective_from
        )

        db.add(new_salary)
        db.commit()
        db.refresh(new_salary)

        return TeacherSalaryResponse(
            id=new_salary.id,
            teacher_id=new_salary.teacher_id,
            teacher_name=teacher.teacher_name,
            base_salary=new_salary.base_salary,
            effective_from=new_salary.effective_from,
            created_at=new_salary.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating teacher salary: {str(e)}"
        )


@salary_router.get("/teacher-salary/{teacher_id}", response_model=List[TeacherSalaryResponse])
def get_teacher_salary_history(
    teacher_id: int,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())]
):
    """Get salary history for a specific teacher."""
    try:
        salaries = db.exec(
            select(TeacherSalary)
            .where(TeacherSalary.teacher_id == teacher_id)
            .order_by(TeacherSalary.effective_from.desc())
        ).all()

        teacher = db.exec(
            select(TeacherNames)
            .where(TeacherNames.teacher_name_id == teacher_id)
        ).first()

        response = []
        for salary in salaries:
            response.append(
                TeacherSalaryResponse(
                    id=salary.id,
                    teacher_id=salary.teacher_id,
                    teacher_name=teacher.teacher_name if teacher else None,
                    base_salary=salary.base_salary,
                    effective_from=salary.effective_from,
                    created_at=salary.created_at
                )
            )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching teacher salary history: {str(e)}"
        )


@salary_router.put("/teacher-salary/{salary_id}", response_model=TeacherSalaryResponse)
def update_teacher_salary(
    salary_id: int,
    salary_data: TeacherSalaryUpdate,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin())]
):
    """Update a teacher salary record. Admin only."""
    try:
        salary = db.exec(
            select(TeacherSalary)
            .where(TeacherSalary.id == salary_id)
        ).first()
        
        if not salary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher salary record with ID {salary_id} not found"
            )
        
        # Update fields if provided
        if salary_data.base_salary is not None:
            salary.base_salary = salary_data.base_salary
        if salary_data.effective_from is not None:
            salary.effective_from = salary_data.effective_from
        
        db.add(salary)
        db.commit()
        db.refresh(salary)
        
        teacher = db.exec(
            select(TeacherNames)
            .where(TeacherNames.teacher_name_id == salary.teacher_id)
        ).first()
        
        return TeacherSalaryResponse(
            id=salary.id,
            teacher_id=salary.teacher_id,
            teacher_name=teacher.teacher_name if teacher else None,
            base_salary=salary.base_salary,
            effective_from=salary.effective_from,
            created_at=salary.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating teacher salary: {str(e)}"
        )


@salary_router.delete("/teacher-salary/{salary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher_salary(
    salary_id: int,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin())]
):
    """Delete a teacher salary record. Admin only."""
    try:
        salary = db.exec(
            select(TeacherSalary)
            .where(TeacherSalary.id == salary_id)
        ).first()

        if not salary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher salary record with ID {salary_id} not found"
            )

        # Delete all salary-related records for this teacher to prevent orphan data
        db.exec(delete(SalaryPayment).where(SalaryPayment.teacher_id == salary.teacher_id))
        db.exec(delete(Allowance).where(Allowance.teacher_id == salary.teacher_id))
        db.exec(delete(Deduction).where(Deduction.teacher_id == salary.teacher_id))
        db.exec(delete(SalaryLedger).where(SalaryLedger.teacher_id == salary.teacher_id))

        db.delete(salary)
        db.commit()
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting teacher salary: {str(e)}"
        )


# ============================================================================
# SALARY LEDGER MANAGEMENT (Monthly Records - Heart of System)
# ============================================================================

@salary_router.get("/ledger/all", response_model=List[SalaryLedgerResponse])
def get_all_salary_ledgers(
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())]
):
    """Get all salary ledger records."""
    try:
        # Use JOIN to fetch ledgers with teacher names in a single query (avoids N+1 problem)
        ledgers = db.exec(
            select(SalaryLedger, TeacherNames)
            .join(TeacherNames, SalaryLedger.teacher_id == TeacherNames.teacher_name_id)
        ).all()

        response = []
        for ledger, teacher in ledgers:
            response.append(
                SalaryLedgerResponse(
                    id=ledger.id,
                    teacher_id=ledger.teacher_id,
                    teacher_name=teacher.teacher_name if teacher else None,
                    month=ledger.month,
                    year=ledger.year,
                    base_salary=ledger.base_salary,
                    allowance_total=ledger.allowance_total or 0,
                    deduction_total=ledger.deduction_total or 0,
                    net_salary=ledger.net_salary,
                    total_paid=ledger.total_paid or 0,
                    remaining=ledger.remaining,
                    created_at=ledger.created_at
                )
            )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching salary ledgers: {str(e)}"
        )


@salary_router.post("/ledger/add", response_model=SalaryLedgerResponse, status_code=status.HTTP_201_CREATED)
def create_salary_ledger(
    ledger_data: SalaryLedgerCreate,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())]
):
    """Create a new salary ledger record."""
    try:
        # Verify teacher exists
        teacher = db.exec(
            select(TeacherNames)
            .where(TeacherNames.teacher_name_id == ledger_data.teacher_id)
        ).first()

        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {ledger_data.teacher_id} not found"
            )

        # Return existing ledger if already present for the same teacher/month/year
        existing_ledger = db.exec(
            select(SalaryLedger)
            .where(
                SalaryLedger.teacher_id == ledger_data.teacher_id,
                SalaryLedger.month == ledger_data.month,
                SalaryLedger.year == ledger_data.year
            )
        ).first()

        if existing_ledger:
            return SalaryLedgerResponse(
                id=existing_ledger.id,
                teacher_id=existing_ledger.teacher_id,
                teacher_name=teacher.teacher_name,
                month=existing_ledger.month,
                year=existing_ledger.year,
                base_salary=existing_ledger.base_salary,
                allowance_total=existing_ledger.allowance_total,
                deduction_total=existing_ledger.deduction_total,
                net_salary=existing_ledger.net_salary,
                total_paid=existing_ledger.total_paid,
                remaining=existing_ledger.remaining,
                created_at=existing_ledger.created_at
            )

        # Create new ledger record
        new_ledger = SalaryLedger(
            teacher_id=ledger_data.teacher_id,
            month=ledger_data.month,
            year=ledger_data.year,
            base_salary=ledger_data.base_salary,
            allowance_total=ledger_data.allowance_total or 0,
            deduction_total=ledger_data.deduction_total or 0,
            net_salary=ledger_data.net_salary,
            total_paid=ledger_data.total_paid or 0,
            remaining=ledger_data.remaining
        )

        db.add(new_ledger)
        db.commit()
        db.refresh(new_ledger)

        return SalaryLedgerResponse(
            id=new_ledger.id,
            teacher_id=new_ledger.teacher_id,
            teacher_name=teacher.teacher_name,
            month=new_ledger.month,
            year=new_ledger.year,
            base_salary=new_ledger.base_salary,
            allowance_total=new_ledger.allowance_total,
            deduction_total=new_ledger.deduction_total,
            net_salary=new_ledger.net_salary,
            total_paid=new_ledger.total_paid,
            remaining=new_ledger.remaining,
            created_at=new_ledger.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating salary ledger: {str(e)}"
        )


@salary_router.post("/ledger/ensure/{teacher_id}/{month}/{year}", response_model=SalaryLedgerResponse)
def ensure_teacher_ledger(
    teacher_id: int,
    month: int,
    year: int,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())]
):
    """Ensure a salary ledger exists for the given teacher/month/year, creating it if necessary."""
    try:
        ledger = ensure_salary_ledger_exists(db, teacher_id, month, year)

        teacher = db.exec(
            select(TeacherNames)
            .where(TeacherNames.teacher_name_id == teacher_id)
        ).first()

        return SalaryLedgerResponse(
            id=ledger.id,
            teacher_id=ledger.teacher_id,
            teacher_name=teacher.teacher_name if teacher else None,
            month=ledger.month,
            year=ledger.year,
            base_salary=ledger.base_salary,
            allowance_total=ledger.allowance_total,
            deduction_total=ledger.deduction_total,
            net_salary=ledger.net_salary,
            total_paid=ledger.total_paid,
            remaining=ledger.remaining,
            created_at=ledger.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error ensuring salary ledger: {str(e)}"
        )


@salary_router.put("/ledger/{ledger_id}", response_model=SalaryLedgerResponse)
def update_salary_ledger(
    ledger_id: int,
    ledger_data: SalaryLedgerUpdate,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin())]
):
    """Update a salary ledger record. Admin only."""
    try:
        ledger = db.exec(
            select(SalaryLedger)
            .where(SalaryLedger.id == ledger_id)
        ).first()

        if not ledger:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Salary ledger record with ID {ledger_id} not found"
            )

        # Update fields if provided
        if ledger_data.allowance_total is not None:
            ledger.allowance_total = ledger_data.allowance_total
        if ledger_data.deduction_total is not None:
            ledger.deduction_total = ledger_data.deduction_total
        if ledger_data.net_salary is not None:
            ledger.net_salary = ledger_data.net_salary
        if ledger_data.total_paid is not None:
            ledger.total_paid = ledger_data.total_paid
        if ledger_data.remaining is not None:
            ledger.remaining = ledger_data.remaining

        # Recalculate net_salary if allowances/deductions changed
        if ledger_data.allowance_total is not None or ledger_data.deduction_total is not None:
            ledger.net_salary = ledger.base_salary + (ledger.allowance_total or 0) - (ledger.deduction_total or 0)
            ledger.remaining = ledger.net_salary - (ledger.total_paid or 0)

        db.commit()
        db.refresh(ledger)

        # Get teacher name
        teacher = db.exec(
            select(TeacherNames)
            .where(TeacherNames.teacher_name_id == ledger.teacher_id)
        ).first()

        return SalaryLedgerResponse(
            id=ledger.id,
            teacher_id=ledger.teacher_id,
            teacher_name=teacher.teacher_name if teacher else None,
            month=ledger.month,
            year=ledger.year,
            base_salary=ledger.base_salary,
            allowance_total=ledger.allowance_total,
            deduction_total=ledger.deduction_total,
            net_salary=ledger.net_salary,
            total_paid=ledger.total_paid,
            remaining=ledger.remaining,
            created_at=ledger.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating salary ledger: {str(e)}"
        )


@salary_router.delete("/ledger/{ledger_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_salary_ledger(
    ledger_id: int,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin())]
):
    """Delete a salary ledger record. Admin only."""
    try:
        ledger = db.exec(
            select(SalaryLedger)
            .where(SalaryLedger.id == ledger_id)
        ).first()

        if not ledger:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Salary ledger record with ID {ledger_id} not found"
            )

        db.delete(ledger)
        db.commit()
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting salary ledger: {str(e)}"
        )


# ============================================================================
# SALARY PAYMENT MANAGEMENT (Transaction Records)
# ============================================================================

@salary_router.post("/payment/add", response_model=SalaryPaymentResponse, status_code=status.HTTP_201_CREATED)
def create_salary_payment(
    payment_data: SalaryPaymentCreate,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())]
):
    """Create a new salary payment record."""
    try:
        # Verify teacher exists
        teacher = db.exec(
            select(TeacherNames)
            .where(TeacherNames.teacher_name_id == payment_data.teacher_id)
        ).first()

        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {payment_data.teacher_id} not found"
            )

        # Verify ledger exists (should already exist, but double-check)
        ledger = db.exec(
            select(SalaryLedger)
            .where(SalaryLedger.id == payment_data.ledger_id)
        ).first()

        if not ledger:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Salary ledger with ID {payment_data.ledger_id} not found"
            )

        # Create payment record
        new_payment = SalaryPayment(
            teacher_id=payment_data.teacher_id,
            ledger_id=payment_data.ledger_id,
            amount=payment_data.amount,
            payment_date=payment_data.payment_date
        )

        # Update ledger total_paid and remaining
        ledger.total_paid += payment_data.amount
        ledger.remaining = ledger.net_salary - ledger.total_paid

        db.add(new_payment)
        db.add(ledger)
        db.commit()
        db.refresh(new_payment)

        return SalaryPaymentResponse(
            id=new_payment.id,
            teacher_id=new_payment.teacher_id,
            teacher_name=teacher.teacher_name,
            ledger_id=new_payment.ledger_id,
            amount=new_payment.amount,
            payment_date=new_payment.payment_date,
            created_at=new_payment.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating salary payment: {str(e)}"
        )


@salary_router.get("/payment/ledger/{ledger_id}", response_model=List[SalaryPaymentResponse])
def get_ledger_payments(
    ledger_id: int,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())]
):
    """Get all payments for a specific salary ledger."""
    try:
        payments = db.exec(
            select(SalaryPayment)
            .where(SalaryPayment.ledger_id == ledger_id)
            .order_by(SalaryPayment.payment_date.desc())
        ).all()

        response = []
        for payment in payments:
            teacher = db.exec(
                select(TeacherNames)
                .where(TeacherNames.teacher_name_id == payment.teacher_id)
            ).first()

            response.append(
                SalaryPaymentResponse(
                    id=payment.id,
                    teacher_id=payment.teacher_id,
                    teacher_name=teacher.teacher_name if teacher else None,
                    ledger_id=payment.ledger_id,
                    amount=payment.amount,
                    payment_date=payment.payment_date,
                    created_at=payment.created_at
                )
            )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching ledger payments: {str(e)}"
        )


@salary_router.get("/payment/all", response_model=List[SalaryPaymentResponse])
def get_all_payments(
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())]
):
    """Get all salary payments."""
    try:
        payments = db.exec(
            select(SalaryPayment)
            .order_by(SalaryPayment.payment_date.desc())
        ).all()

        response = []
        for payment in payments:
            teacher = db.exec(
                select(TeacherNames)
                .where(TeacherNames.teacher_name_id == payment.teacher_id)
            ).first()

            response.append(
                SalaryPaymentResponse(
                    id=payment.id,
                    teacher_id=payment.teacher_id,
                    teacher_name=teacher.teacher_name if teacher else None,
                    ledger_id=payment.ledger_id,
                    amount=payment.amount,
                    payment_date=payment.payment_date,
                    created_at=payment.created_at
                )
            )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching all payments: {str(e)}"
        )


@salary_router.delete("/payment/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_salary_payment(
    payment_id: int,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin())]
):
    """Delete a salary payment. Admin only."""
    try:
        payment = db.exec(
            select(SalaryPayment)
            .where(SalaryPayment.id == payment_id)
        ).first()

        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Salary payment with ID {payment_id} not found"
            )

        # Store ledger info for recalculation before deletion
        ledger = db.exec(
            select(SalaryLedger)
            .where(SalaryLedger.id == payment.ledger_id)
        ).first()

        db.delete(payment)
        db.commit()

        # Recalculate ledger totals after payment deletion
        if ledger:
            recalculate_ledger_totals(db, ledger.teacher_id, ledger.month, ledger.year)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting salary payment: {str(e)}"
        )


@salary_router.put("/payment/{payment_id}", response_model=SalaryPaymentResponse)
def update_salary_payment(
    payment_id: int,
    payment_data: SalaryPaymentUpdate,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())]
):
    """Update a salary payment record."""
    try:
        payment = db.exec(
            select(SalaryPayment)
            .where(SalaryPayment.id == payment_id)
        ).first()

        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Salary payment with ID {payment_id} not found"
            )

        if payment_data.amount is not None:
            payment.amount = payment_data.amount
        if payment_data.payment_date is not None:
            payment.payment_date = payment_data.payment_date

        db.add(payment)
        db.commit()
        db.refresh(payment)

        # Recalculate ledger totals after payment update
        ledger = db.exec(
            select(SalaryLedger)
            .where(SalaryLedger.id == payment.ledger_id)
        ).first()
        if ledger:
            recalculate_ledger_totals(db, ledger.teacher_id, ledger.month, ledger.year)

        teacher = db.exec(
            select(TeacherNames)
            .where(TeacherNames.teacher_name_id == payment.teacher_id)
        ).first()

        return SalaryPaymentResponse(
            id=payment.id,
            teacher_id=payment.teacher_id,
            teacher_name=teacher.teacher_name if teacher else None,
            ledger_id=payment.ledger_id,
            amount=payment.amount,
            payment_date=payment.payment_date,
            created_at=payment.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating salary payment: {str(e)}"
        )


# ============================================================================
# ALLOWANCE MANAGEMENT
# ============================================================================

@salary_router.post("/allowance/add", response_model=AllowanceResponse, status_code=status.HTTP_201_CREATED)
def create_allowance(
    allowance_data: AllowanceCreate,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())]
):
    """Create a new allowance record."""
    try:
        # Verify teacher exists
        teacher = db.exec(
            select(TeacherNames)
            .where(TeacherNames.teacher_name_id == allowance_data.teacher_id)
        ).first()

        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {allowance_data.teacher_id} not found"
            )

        # Ensure salary ledger exists for this teacher/month/year
        ledger = ensure_salary_ledger_exists(
            db, allowance_data.teacher_id, allowance_data.month, allowance_data.year
        )

        # Create allowance record
        new_allowance = Allowance(
            teacher_id=allowance_data.teacher_id,
            month=allowance_data.month,
            year=allowance_data.year,
            amount=allowance_data.amount,
            reason=allowance_data.reason
        )

        # Update corresponding ledger if it exists
        ledger.allowance_total += allowance_data.amount
        ledger.net_salary = ledger.base_salary + ledger.allowance_total - ledger.deduction_total
        ledger.remaining = ledger.net_salary - ledger.total_paid
        db.add(ledger)

        db.add(new_allowance)
        db.commit()
        db.refresh(new_allowance)

        return AllowanceResponse(
            id=new_allowance.id,
            teacher_id=new_allowance.teacher_id,
            teacher_name=teacher.teacher_name,
            month=new_allowance.month,
            year=new_allowance.year,
            amount=new_allowance.amount,
            reason=new_allowance.reason,
            created_at=new_allowance.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating allowance: {str(e)}"
        )


@salary_router.get("/allowance/teacher/{teacher_id}", response_model=List[AllowanceResponse])
def get_teacher_allowances(
    teacher_id: int,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())],
    month: int = None,
    year: int = None
):
    """Get allowances for a specific teacher, optionally filtered by month/year."""
    try:
        query = select(Allowance).where(Allowance.teacher_id == teacher_id)

        if month and year:
            query = query.where(
                Allowance.month == month,
                Allowance.year == year
            )

        allowances = db.exec(query.order_by(Allowance.year.desc(), Allowance.month.desc())).all()

        teacher = db.exec(
            select(TeacherNames)
            .where(TeacherNames.teacher_name_id == teacher_id)
        ).first()

        response = []
        for allowance in allowances:
            response.append(
                AllowanceResponse(
                    id=allowance.id,
                    teacher_id=allowance.teacher_id,
                    teacher_name=teacher.teacher_name if teacher else None,
                    month=allowance.month,
                    year=allowance.year,
                    amount=allowance.amount,
                    reason=allowance.reason,
                    created_at=allowance.created_at
                )
            )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching teacher allowances: {str(e)}"
        )


@salary_router.get("/allowance/all", response_model=List[AllowanceResponse])
def get_all_allowances(
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())]
):
    """Get all allowances."""
    try:
        allowances = db.exec(
            select(Allowance)
            .order_by(Allowance.year.desc(), Allowance.month.desc())
        ).all()

        response = []
        for allowance in allowances:
            teacher = db.exec(
                select(TeacherNames)
                .where(TeacherNames.teacher_name_id == allowance.teacher_id)
            ).first()

            response.append(
                AllowanceResponse(
                    id=allowance.id,
                    teacher_id=allowance.teacher_id,
                    teacher_name=teacher.teacher_name if teacher else None,
                    month=allowance.month,
                    year=allowance.year,
                    amount=allowance.amount,
                    reason=allowance.reason,
                    created_at=allowance.created_at
                )
            )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching all allowances: {str(e)}"
        )


@salary_router.delete("/allowance/{allowance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_allowance(
    allowance_id: int,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin())]
):
    """Delete an allowance record. Admin only."""
    try:
        allowance = db.exec(
            select(Allowance)
            .where(Allowance.id == allowance_id)
        ).first()

        if not allowance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Allowance with ID {allowance_id} not found"
            )

        # Store values for ledger recalculation before deletion
        teacher_id = allowance.teacher_id
        month = allowance.month
        year = allowance.year

        db.delete(allowance)
        db.commit()

        # Recalculate ledger totals after allowance deletion
        recalculate_ledger_totals(db, teacher_id, month, year)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting allowance: {str(e)}"
        )


@salary_router.put("/allowance/{allowance_id}", response_model=AllowanceResponse)
def update_allowance(
    allowance_id: int,
    allowance_data: AllowanceUpdate,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())]
):
    """Update an allowance record."""
    try:
        allowance = db.exec(
            select(Allowance)
            .where(Allowance.id == allowance_id)
        ).first()

        if not allowance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Allowance with ID {allowance_id} not found"
            )

        if allowance_data.amount is not None:
            allowance.amount = allowance_data.amount
        if allowance_data.reason is not None:
            allowance.reason = allowance_data.reason

        db.add(allowance)
        db.commit()
        db.refresh(allowance)

        # Recalculate ledger totals after allowance update
        recalculate_ledger_totals(db, allowance.teacher_id, allowance.month, allowance.year)

        teacher = db.exec(
            select(TeacherNames)
            .where(TeacherNames.teacher_name_id == allowance.teacher_id)
        ).first()

        return AllowanceResponse(
            id=allowance.id,
            teacher_id=allowance.teacher_id,
            teacher_name=teacher.teacher_name if teacher else None,
            month=allowance.month,
            year=allowance.year,
            amount=allowance.amount,
            reason=allowance.reason,
            created_at=allowance.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating allowance: {str(e)}"
        )


# ============================================================================
# DEDUCTION MANAGEMENT
# ============================================================================

@salary_router.post("/deduction/add", response_model=DeductionResponse, status_code=status.HTTP_201_CREATED)
def create_deduction(
    deduction_data: DeductionCreate,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())]
):
    """Create a new deduction record."""
    try:
        # Verify teacher exists
        teacher = db.exec(
            select(TeacherNames)
            .where(TeacherNames.teacher_name_id == deduction_data.teacher_id)
        ).first()

        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {deduction_data.teacher_id} not found"
            )

        # Ensure salary ledger exists for this teacher/month/year
        ledger = ensure_salary_ledger_exists(
            db, deduction_data.teacher_id, deduction_data.month, deduction_data.year
        )

        # Create deduction record
        new_deduction = Deduction(
            teacher_id=deduction_data.teacher_id,
            month=deduction_data.month,
            year=deduction_data.year,
            amount=deduction_data.amount,
            type=deduction_data.type,
            reason=deduction_data.reason
        )

        # Update corresponding ledger
        ledger.deduction_total += deduction_data.amount
        ledger.net_salary = ledger.base_salary + ledger.allowance_total - ledger.deduction_total
        ledger.remaining = ledger.net_salary - ledger.total_paid
        db.add(ledger)

        db.add(new_deduction)
        db.commit()
        db.refresh(new_deduction)

        return DeductionResponse(
            id=new_deduction.id,
            teacher_id=new_deduction.teacher_id,
            teacher_name=teacher.teacher_name,
            month=new_deduction.month,
            year=new_deduction.year,
            amount=new_deduction.amount,
            type=new_deduction.type,
            reason=new_deduction.reason,
            created_at=new_deduction.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating deduction: {str(e)}"
        )


@salary_router.get("/deduction/teacher/{teacher_id}", response_model=List[DeductionResponse])
def get_teacher_deductions(
    teacher_id: int,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())],
    month: int = None,
    year: int = None
):
    """Get deductions for a specific teacher, optionally filtered by month/year."""
    try:
        query = select(Deduction).where(Deduction.teacher_id == teacher_id)

        if month and year:
            query = query.where(
                Deduction.month == month,
                Deduction.year == year
            )

        deductions = db.exec(query.order_by(Deduction.year.desc(), Deduction.month.desc())).all()

        teacher = db.exec(
            select(TeacherNames)
            .where(TeacherNames.teacher_name_id == teacher_id)
        ).first()

        response = []
        for deduction in deductions:
            response.append(
                DeductionResponse(
                    id=deduction.id,
                    teacher_id=deduction.teacher_id,
                    teacher_name=teacher.teacher_name if teacher else None,
                    month=deduction.month,
                    year=deduction.year,
                    amount=deduction.amount,
                    type=deduction.type,
                    reason=deduction.reason,
                    created_at=deduction.created_at
                )
            )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching teacher deductions: {str(e)}"
        )


@salary_router.get("/deduction/all", response_model=List[DeductionResponse])
def get_all_deductions(
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())]
):
    """Get all deductions."""
    try:
        deductions = db.exec(
            select(Deduction)
            .order_by(Deduction.year.desc(), Deduction.month.desc())
        ).all()

        response = []
        for deduction in deductions:
            teacher = db.exec(
                select(TeacherNames)
                .where(TeacherNames.teacher_name_id == deduction.teacher_id)
            ).first()

            response.append(
                DeductionResponse(
                    id=deduction.id,
                    teacher_id=deduction.teacher_id,
                    teacher_name=teacher.teacher_name if teacher else None,
                    month=deduction.month,
                    year=deduction.year,
                    amount=deduction.amount,
                    type=deduction.type,
                    reason=deduction.reason,
                    created_at=deduction.created_at
                )
            )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching all deductions: {str(e)}"
        )


@salary_router.delete("/deduction/{deduction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deduction(
    deduction_id: int,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin())]
):
    """Delete a deduction record. Admin only."""
    try:
        deduction = db.exec(
            select(Deduction)
            .where(Deduction.id == deduction_id)
        ).first()

        if not deduction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Deduction with ID {deduction_id} not found"
            )

        # Store values for ledger recalculation before deletion
        teacher_id = deduction.teacher_id
        month = deduction.month
        year = deduction.year

        db.delete(deduction)
        db.commit()

        # Recalculate ledger totals after deduction deletion
        recalculate_ledger_totals(db, teacher_id, month, year)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting deduction: {str(e)}"
        )


@salary_router.put("/deduction/{deduction_id}", response_model=DeductionResponse)
def update_deduction(
    deduction_id: int,
    deduction_data: DeductionUpdate,
    db: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(require_admin_accountant())]
):
    """Update a deduction record."""
    try:
        deduction = db.exec(
            select(Deduction)
            .where(Deduction.id == deduction_id)
        ).first()

        if not deduction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Deduction with ID {deduction_id} not found"
            )

        if deduction_data.amount is not None:
            deduction.amount = deduction_data.amount
        if deduction_data.type is not None:
            deduction.type = deduction_data.type
        if deduction_data.reason is not None:
            deduction.reason = deduction_data.reason

        db.add(deduction)
        db.commit()
        db.refresh(deduction)

        # Recalculate ledger totals after deduction update
        recalculate_ledger_totals(db, deduction.teacher_id, deduction.month, deduction.year)

        teacher = db.exec(
            select(TeacherNames)
            .where(TeacherNames.teacher_name_id == deduction.teacher_id)
        ).first()

        return DeductionResponse(
            id=deduction.id,
            teacher_id=deduction.teacher_id,
            teacher_name=teacher.teacher_name if teacher else None,
            month=deduction.month,
            year=deduction.year,
            amount=deduction.amount,
            type=deduction.type,
            reason=deduction.reason,
            created_at=deduction.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating deduction: {str(e)}"
        )
