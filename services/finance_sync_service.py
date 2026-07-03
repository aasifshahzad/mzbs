"""
Finance Synchronization Service
Handles automatic synchronization of financial records:
- Paid Fee → Income
- Salary Payment → Expense
- Allowance → Expense
"""

from datetime import datetime
from decimal import Decimal
from sqlmodel import Session, select
from sqlalchemy import func
from fastapi import HTTPException
from schemas.income_model import Income, IncomeCreate
from schemas.expense_model import Expense, ExpenseCreate
from schemas.income_cat_names_model import IncomeCatNames
from schemas.expense_cat_names_model import ExpenseCatNames


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY NAME CONSTANTS
# ══════════════════════════════════════════════════════════════════════════════

FEE_INCOME_CATEGORY_NAME = "ماہانہ فیس"
SALARY_EXPENSE_CATEGORY_NAME = "تنخواہ"
ALLOWANCE_EXPENSE_CATEGORY_NAME = "الاؤنس"


# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def _get_income_category_id(db: Session, name: str) -> int:
    """
    Retrieve the Income category ID by name (case-sensitive, with trim-safe matching).
    Trim both database value and input to handle trailing spaces gracefully.
    Raises ValueError if category is missing.
    """
    category = db.exec(
        select(IncomeCatNames).where(
            func.trim(IncomeCatNames.income_cat_name) == name.strip()
        )
    ).first()
    
    if not category:
        raise ValueError(
            f"Income category '{name}' not found in database. It must exist before auto-sync can work."
        )
    
    return category.income_cat_name_id


def _get_expense_category_id(db: Session, name: str) -> int:
    """
    Retrieve the Expense category ID by name (case-sensitive, with trim-safe matching).
    Trim both database value and input to handle trailing spaces gracefully.
    Raises ValueError if category is missing.
    """
    category = db.exec(
        select(ExpenseCatNames).where(
            func.trim(ExpenseCatNames.expense_cat_name) == name.strip()
        )
    ).first()
    
    if not category:
        raise ValueError(
            f"Expense category '{name}' not found in database. It must exist before auto-sync can work."
        )
    
    return category.expense_cat_name_id


# ══════════════════════════════════════════════════════════════════════════════
# FEE → INCOME SYNCHRONIZATION
# ══════════════════════════════════════════════════════════════════════════════

def sync_income_for_fee(
    db: Session,
    fee,
    student_name: str | None,
    father_name: str | None,
    class_name: str | None
) -> Income:
    """
    Synchronize a paid fee to an income record.
    
    If an Income with the same (source_type='fee', source_id=fee_id) exists, update it.
    Otherwise, create a new Income record.
    
    Amount and date always sync to maintain accounting accuracy.
    Source is only updated if student_name is provided (preserves existing source
    if student was deleted after the fee was paid).
    
    Returns the linked Income record.
    """
    try:
        category_id = _get_income_category_id(db, FEE_INCOME_CATEGORY_NAME)
        
        # Format source only if we have student data
        source_label = (
            f"{student_name} ({father_name}) - {class_name}"
            if student_name is not None
            else None
        )
        description = f"Auto-generated from Fee ID {fee.fee_id}"
        
        # Check if linked income already exists
        existing_income = db.exec(
            select(Income).where(
                Income.source_type == "fee",
                Income.source_id == fee.fee_id
            )
        ).first()
        
        if existing_income:
            # Update existing income: amount and date always sync,
            # source only updates if we have real student data
            existing_income.amount = float(fee.fee_amount)
            existing_income.date = fee.created_at
            if source_label is not None:
                existing_income.source = source_label
            existing_income.description = description
            db.add(existing_income)
            db.flush()
            db.commit()
            return existing_income
        else:
            # Create new income
            # First-time creation with no student data is an edge case that
            # shouldn't happen (a fee can't be Paid without a student at creation
            # time), but guard anyway rather than writing "None (None) - None".
            new_income = Income(
                recipt_number=None,
                date=fee.created_at,
                category_id=category_id,
                source=source_label or "Unknown Student",
                description=description,
                contact=None,
                amount=float(fee.fee_amount),
                source_type="fee",
                source_id=fee.fee_id,
                created_at=datetime.utcnow()
            )
            db.add(new_income)
            db.flush()
            db.commit()
            return new_income
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error synchronizing fee to income: {str(e)}"
        )


def delete_income_for_fee(db: Session, fee_id: int) -> None:
    """
    Delete the linked income record for a fee.
    """
    try:
        income = db.exec(
            select(Income).where(
                Income.source_type == "fee",
                Income.source_id == fee_id
            )
        ).first()
        
        if income:
            db.delete(income)
            db.flush()
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting linked income: {str(e)}"
        )


# ══════════════════════════════════════════════════════════════════════════════
# SALARY PAYMENT → EXPENSE SYNCHRONIZATION
# ══════════════════════════════════════════════════════════════════════════════

def sync_expense_for_salary_payment(
    db: Session,
    payment,
    teacher_name: str
) -> Expense:
    """
    Synchronize a salary payment to an expense record.
    
    If an Expense with the same (source_type='salary_payment', source_id=payment_id) exists,
    update it. Otherwise, create a new Expense record.
    
    Returns the linked Expense record.
    """
    try:
        category_id = _get_expense_category_id(db, SALARY_EXPENSE_CATEGORY_NAME)
        description = f"Auto-generated from Salary Payment ID {payment.id}"
        
        # Check if linked expense already exists
        existing_expense = db.exec(
            select(Expense).where(
                Expense.source_type == "salary_payment",
                Expense.source_id == payment.id
            )
        ).first()
        
        if existing_expense:
            # Update existing expense
            existing_expense.amount = float(payment.amount)
            existing_expense.date = payment.payment_date
            existing_expense.to_whom = teacher_name
            existing_expense.description = description
            db.add(existing_expense)
            db.flush()
            db.commit()
            return existing_expense
        else:
            # Create new expense
            new_expense = Expense(
                recipt_number=None,
                date=payment.payment_date,
                category_id=category_id,
                to_whom=teacher_name,
                description=description,
                amount=float(payment.amount),
                source_type="salary_payment",
                source_id=payment.id,
                created_at=datetime.utcnow()
            )
            db.add(new_expense)
            db.flush()
            db.commit()
            return new_expense
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error synchronizing salary payment to expense: {str(e)}"
        )


def delete_expense_for_salary_payment(db: Session, payment_id: int) -> None:
    """
    Delete the linked expense record for a salary payment.
    """
    try:
        expense = db.exec(
            select(Expense).where(
                Expense.source_type == "salary_payment",
                Expense.source_id == payment_id
            )
        ).first()
        
        if expense:
            db.delete(expense)
            db.flush()
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting linked expense for salary payment: {str(e)}"
        )


# ══════════════════════════════════════════════════════════════════════════════
# ALLOWANCE → EXPENSE SYNCHRONIZATION
# ══════════════════════════════════════════════════════════════════════════════

def sync_expense_for_allowance(
    db: Session,
    allowance,
    teacher_name: str
) -> Expense:
    """
    Synchronize an allowance to an expense record.
    
    If an Expense with the same (source_type='allowance', source_id=allowance_id) exists,
    update it. Otherwise, create a new Expense record.
    
    Returns the linked Expense record.
    """
    try:
        category_id = _get_expense_category_id(db, ALLOWANCE_EXPENSE_CATEGORY_NAME)
        
        # Build description with reason if available
        if allowance.reason:
            description = f"Auto-generated from Allowance ID {allowance.id} ({allowance.reason})"
        else:
            description = f"Auto-generated from Allowance ID {allowance.id}"
        
        # Check if linked expense already exists
        existing_expense = db.exec(
            select(Expense).where(
                Expense.source_type == "allowance",
                Expense.source_id == allowance.id
            )
        ).first()
        
        if existing_expense:
            # Update existing expense
            existing_expense.amount = float(allowance.amount)
            existing_expense.date = allowance.created_at
            existing_expense.to_whom = teacher_name
            existing_expense.description = description
            db.add(existing_expense)
            db.flush()
            db.commit()
            return existing_expense
        else:
            # Create new expense
            new_expense = Expense(
                recipt_number=None,
                date=allowance.created_at,
                category_id=category_id,
                to_whom=teacher_name,
                description=description,
                amount=float(allowance.amount),
                source_type="allowance",
                source_id=allowance.id,
                created_at=datetime.utcnow()
            )
            db.add(new_expense)
            db.flush()
            db.commit()
            return new_expense
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error synchronizing allowance to expense: {str(e)}"
        )


def delete_expense_for_allowance(db: Session, allowance_id: int) -> None:
    """
    Delete the linked expense record for an allowance.
    """
    try:
        expense = db.exec(
            select(Expense).where(
                Expense.source_type == "allowance",
                Expense.source_id == allowance_id
            )
        ).first()
        
        if expense:
            db.delete(expense)
            db.flush()
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting linked expense for allowance: {str(e)}"
        )
