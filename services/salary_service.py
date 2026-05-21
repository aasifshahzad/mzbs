ack"""
Salary Service - Historical Salary Management
Handles salary period calculations, timeline management, and prorated payables.
"""

from datetime import date, timedelta
from decimal import Decimal
from sqlmodel import Session, select, func
from typing import Optional, Dict, List
from schemas.salary_model import TeacherSalary, SalaryLedger, SalaryPayment, Allowance, Deduction
from schemas.teacher_names_model import TeacherNames

# Fixed divisor for daily rate calculation: monthly salary ÷ 30 = daily rate
DAILY_DIVISOR = 30


# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def _period_till(record: TeacherSalary) -> date:
    """
    Return the effective end date of a salary period.
    NULL effective_till means the record is still active → use today.
    """
    if record.effective_till is not None:
        # Handle both date objects and string formats
        if isinstance(record.effective_till, date):
            return record.effective_till
        return date.fromisoformat(record.effective_till)
    return date.today()


def _days_in_period(from_date: date, till_date: date) -> int:
    """Inclusive day count: from_date to till_date."""
    return (till_date - from_date).days + 1


def _prorated_salary(base_salary: Decimal, days: int) -> Decimal:
    """Calculate prorated salary based on daily rate."""
    daily_rate = base_salary / DAILY_DIVISOR
    return round(daily_rate * days, 2)


# ══════════════════════════════════════════════════════════════════════════════
# EFFECTIVE_TILL MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

def close_previous_active_record(
    session: Session,
    teacher_id: int,
    new_effective_from: date,
) -> None:
    """
    When a new salary record is being inserted, find the currently active
    (effective_till IS NULL) record and close it one day before the new one.
    """
    stmt = (
        select(TeacherSalary)
        .where(TeacherSalary.teacher_id == teacher_id)
        .where(TeacherSalary.effective_till == None)  # noqa: E711
        .order_by(TeacherSalary.effective_from.desc())
        .limit(1)
    )
    active = session.exec(stmt).first()
    if active:
        # Close the active record one day before the new effective_from
        close_date = new_effective_from - timedelta(days=1)
        active.effective_till = close_date.isoformat()
        session.add(active)


def reconnect_neighbors_after_delete(
    session: Session,
    deleted: TeacherSalary,
) -> None:
    """
    After deleting a salary record, make sure the previous record
    now extends up to (next_record.effective_from - 1 day), or becomes
    open-ended (NULL) if there is no next record.
    """
    teacher_id = deleted.teacher_id
    deleted_from = date.fromisoformat(deleted.effective_from)

    # Previous record: highest effective_from that is still < deleted.effective_from
    prev_stmt = (
        select(TeacherSalary)
        .where(TeacherSalary.teacher_id == teacher_id)
        .where(TeacherSalary.effective_from < deleted.effective_from)
        .order_by(TeacherSalary.effective_from.desc())
        .limit(1)
    )
    prev_record = session.exec(prev_stmt).first()

    # Next record: lowest effective_from that is > deleted.effective_from
    next_stmt = (
        select(TeacherSalary)
        .where(TeacherSalary.teacher_id == teacher_id)
        .where(TeacherSalary.effective_from > deleted.effective_from)
        .order_by(TeacherSalary.effective_from.asc())
        .limit(1)
    )
    next_record = session.exec(next_stmt).first()

    if prev_record:
        if next_record:
            # Close previous record one day before next record
            next_from = date.fromisoformat(next_record.effective_from)
            prev_record.effective_till = (next_from - timedelta(days=1)).isoformat()
        else:
            # No next record, previous becomes active again
            prev_record.effective_till = None
        session.add(prev_record)


def recalculate_all_effective_till(session: Session, teacher_id: int) -> None:
    """
    Full recalculation of effective_till for ALL salary records of a teacher.
    Call this after any edit to effective_from or base_salary.
    Records are sorted ascending by effective_from; each record's
    effective_till = next_record.effective_from - 1 day (last = NULL).
    """
    stmt = (
        select(TeacherSalary)
        .where(TeacherSalary.teacher_id == teacher_id)
        .order_by(TeacherSalary.effective_from.asc())
    )
    records = session.exec(stmt).all()

    for i, record in enumerate(records):
        if i < len(records) - 1:
            # Close this record one day before the next record
            next_from = date.fromisoformat(records[i + 1].effective_from)
            record.effective_till = (next_from - timedelta(days=1)).isoformat()
        else:
            # Latest record stays open-ended
            record.effective_till = None
        session.add(record)


# ══════════════════════════════════════════════════════════════════════════════
# SUMMARY CALCULATION
# ══════════════════════════════════════════════════════════════════════════════

def calculate_teacher_salary_summary(
    session: Session,
    teacher_id: int,
) -> Dict:
    """
    Compute the full salary summary for a teacher, considering all
    historical salary periods, allowances, deductions, and payments.
    
    Returns a dictionary with:
    - teacher_id, teacher_name
    - current_base_salary, latest_effective_from
    - total_payable (sum of all prorated periods)
    - total_allowance, total_deduction
    - total_net_salary (payable + allowances - deductions)
    - total_paid
    - remaining (net - paid)
    - salary_history (list of period breakdowns)
    """
    # 1. Fetch all salary records sorted chronologically
    sal_stmt = (
        select(TeacherSalary)
        .where(TeacherSalary.teacher_id == teacher_id)
        .order_by(TeacherSalary.effective_from.asc())
    )
    salary_records = session.exec(sal_stmt).all()

    if not salary_records:
        return _empty_summary(teacher_id)

    # 2. Build salary history with prorated payables
    history = []
    total_payable = Decimal(0)

    for rec in salary_records:
        # Handle both date objects and string formats for effective_from
        if isinstance(rec.effective_from, date):
            from_date = rec.effective_from
            effective_from_str = rec.effective_from.isoformat()
        else:
            from_date = date.fromisoformat(rec.effective_from)
            effective_from_str = rec.effective_from
            
        till_date = _period_till(rec)
        
        # Handle effective_till for response
        if rec.effective_till is not None:
            if isinstance(rec.effective_till, date):
                effective_till_str = rec.effective_till.isoformat()
            else:
                effective_till_str = rec.effective_till
        else:
            effective_till_str = None
        
        # Guard: if somehow from > till (bad data), skip
        if from_date > till_date:
            continue
            
        days = _days_in_period(from_date, till_date)
        period_payable = _prorated_salary(rec.base_salary, days)
        total_payable += period_payable
        
        history.append({
            "id": rec.id,
            "base_salary": float(rec.base_salary),
            "effective_from": effective_from_str,
            "effective_till": effective_till_str,
            "days": days,
            "period_payable": float(period_payable),
        })

    # Latest record metadata
    latest = salary_records[-1]
    
    # Handle latest effective_from for response
    if isinstance(latest.effective_from, date):
        latest_effective_from = latest.effective_from.isoformat()
    else:
        latest_effective_from = latest.effective_from

    # 3. Fetch cumulative allowances
    allowance_stmt = select(func.coalesce(func.sum(Allowance.amount), 0)).where(
        Allowance.teacher_id == teacher_id
    )
    total_allowance = session.scalar(allowance_stmt) or Decimal(0)

    # 4. Fetch cumulative deductions
    deduction_stmt = select(func.coalesce(func.sum(Deduction.amount), 0)).where(
        Deduction.teacher_id == teacher_id
    )
    total_deduction = session.scalar(deduction_stmt) or Decimal(0)

    # 5. Fetch total paid
    paid_stmt = select(func.coalesce(func.sum(SalaryPayment.amount), 0)).where(
        SalaryPayment.teacher_id == teacher_id
    )
    total_paid = session.scalar(paid_stmt) or Decimal(0)

    # 6. Final calculations
    total_net_salary = total_payable + total_allowance - total_deduction
    remaining = total_net_salary - total_paid

    # 7. Get teacher name
    teacher = session.get(TeacherNames, teacher_id)
    teacher_name = teacher.teacher_name if teacher else "Unknown"

    return {
        "teacher_id": teacher_id,
        "teacher_name": teacher_name,
        "current_base_salary": float(latest.base_salary),
        "latest_effective_from": latest_effective_from,
        "total_payable": float(round(total_payable, 2)),
        "total_allowance": float(round(total_allowance, 2)),
        "total_deduction": float(round(total_deduction, 2)),
        "total_net_salary": float(round(total_net_salary, 2)),
        "total_paid": float(round(total_paid, 2)),
        "remaining": float(round(remaining, 2)),
        "salary_history": history,
    }


def _empty_summary(teacher_id: int) -> Dict:
    """Return empty summary when no salary records exist."""
    return {
        "teacher_id": teacher_id,
        "teacher_name": "Unknown",
        "current_base_salary": 0,
        "latest_effective_from": None,
        "total_payable": 0,
        "total_allowance": 0,
        "total_deduction": 0,
        "total_net_salary": 0,
        "total_paid": 0,
        "remaining": 0,
        "salary_history": [],
    }


# ══════════════════════════════════════════════════════════════════════════════
# VALIDATION GUARDS
# ══════════════════════════════════════════════════════════════════════════════

def validate_salary_timeline(
    session: Session,
    teacher_id: int,
    exclude_id: Optional[int] = None
) -> None:
    """
    Ensures:
      1. No two records share the same effective_from.
      2. No overlapping periods (effective_from <= effective_till across records).
      3. Only one open-ended (effective_till = NULL) record exists.
    
    Raises HTTPException if validation fails.
    """
    from fastapi import HTTPException
    
    stmt = (
        select(TeacherSalary)
        .where(TeacherSalary.teacher_id == teacher_id)
        .order_by(TeacherSalary.effective_from.asc())
    )
    if exclude_id:
        stmt = stmt.where(TeacherSalary.id != exclude_id)

    records = session.exec(stmt).all()

    # Check for multiple open-ended records
    open_ended_count = sum(1 for r in records if r.effective_till is None)
    if open_ended_count > 1:
        raise HTTPException(
            status_code=400,
            detail="Only one active (open-ended) salary record is allowed per teacher."
        )

    # Check for overlapping periods
    for i in range(len(records) - 1):
        curr = records[i]
        nxt = records[i + 1]
        if curr.effective_till is not None:
            curr_till = date.fromisoformat(curr.effective_till)
            nxt_from = date.fromisoformat(nxt.effective_from)
            if curr_till >= nxt_from:
                raise HTTPException(
                    status_code=400,
                    detail=f"Overlapping salary periods detected between records {curr.id} and {nxt.id}."
                )

# Made with Bob
