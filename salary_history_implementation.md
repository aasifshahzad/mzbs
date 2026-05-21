# Salary History Implementation Guide

## Overview

This document covers the full implementation for the historically-aware salary system across backend (FastAPI / SQLModel / PostgreSQL) and frontend (Next.js 14 App Router / TypeScript).

---

## 1. Database — Model Changes

### 1.1 `TeacherSalary` model — add `effective_till`

```python
# models/salary.py
from sqlmodel import SQLModel, Field
from datetime import date
from typing import Optional

class TeacherSalary(SQLModel, table=True):
    __tablename__ = "teacher_salary"

    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: int = Field(foreign_key="teacher.id", nullable=False, index=True)
    base_salary: float = Field(nullable=False)
    effective_from: date = Field(nullable=False)
    effective_till: Optional[date] = Field(default=None, nullable=True)
    # NULL means this is the currently active/open-ended record
```

### 1.2 Alembic migration

```python
# alembic/versions/xxxx_add_effective_till_to_teacher_salary.py
def upgrade():
    op.add_column(
        "teacher_salary",
        sa.Column("effective_till", sa.Date(), nullable=True)
    )
    # Backfill: for every teacher, set effective_till on all records
    # except the latest one (leave latest as NULL)
    op.execute("""
        UPDATE teacher_salary ts
        SET effective_till = (
            SELECT MIN(ts2.effective_from) - INTERVAL '1 day'
            FROM teacher_salary ts2
            WHERE ts2.teacher_id = ts.teacher_id
              AND ts2.effective_from > ts.effective_from
        )
        WHERE EXISTS (
            SELECT 1 FROM teacher_salary ts2
            WHERE ts2.teacher_id = ts.teacher_id
              AND ts2.effective_from > ts.effective_from
        )
    """)

def downgrade():
    op.drop_column("teacher_salary", "effective_till")
```

---

## 2. Schemas

```python
# schemas/salary.py
from pydantic import BaseModel, model_validator
from datetime import date
from typing import Optional

class TeacherSalaryCreate(BaseModel):
    teacher_id: int
    base_salary: float
    effective_from: date
    # effective_till is NOT accepted from the client on create;
    # the backend computes it automatically.

class TeacherSalaryUpdate(BaseModel):
    base_salary: Optional[float] = None
    effective_from: Optional[date] = None
    # effective_till is managed by the backend

class SalaryPeriodRead(BaseModel):
    id: int
    base_salary: float
    effective_from: date
    effective_till: Optional[date]   # NULL = currently active
    days: int                        # computed days in this period
    period_payable: float            # prorated salary for this period

class TeacherSummaryResponse(BaseModel):
    teacher_id: int
    teacher_name: str
    current_base_salary: float
    latest_effective_from: date
    total_payable: float
    total_allowance: float
    total_deduction: float
    total_net_salary: float          # total_payable + allowances - deductions
    total_paid: float
    remaining: float
    salary_history: list[SalaryPeriodRead]
```

---

## 3. Backend — Core Salary Logic

### 3.1 `salary_service.py`

```python
# services/salary_service.py
from datetime import date, timedelta
from sqlmodel import Session, select, func
from models.salary import TeacherSalary
from models.ledger import SalaryLedger    # adjust to your actual model name
from models.payment import SalaryPayment  # adjust to your actual model name

DAILY_DIVISOR = 30  # fixed divisor: monthly salary ÷ 30 = daily rate


# ── helpers ────────────────────────────────────────────────────────────────

def _period_till(record: TeacherSalary) -> date:
    """Return the effective end date of a salary period.
    NULL effective_till means the record is still active → use today."""
    return record.effective_till if record.effective_till is not None else date.today()


def _days_in_period(from_date: date, till_date: date) -> int:
    """Inclusive day count: from_date to till_date."""
    return (till_date - from_date).days + 1


def _prorated_salary(base_salary: float, days: int) -> float:
    daily_rate = base_salary / DAILY_DIVISOR
    return round(daily_rate * days, 2)


# ── effective_till management ───────────────────────────────────────────────

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
        active.effective_till = new_effective_from - timedelta(days=1)
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
            prev_record.effective_till = next_record.effective_from - timedelta(days=1)
        else:
            prev_record.effective_till = None  # previous becomes active again
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
            record.effective_till = records[i + 1].effective_from - timedelta(days=1)
        else:
            record.effective_till = None  # latest stays open-ended
        session.add(record)


# ── summary calculation ─────────────────────────────────────────────────────

def calculate_teacher_salary_summary(
    session: Session,
    teacher_id: int,
) -> dict:
    """
    Compute the full salary summary for a teacher, considering all
    historical salary periods, allowances, deductions, and payments.
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
    total_payable = 0.0

    for rec in salary_records:
        till = _period_till(rec)
        # Guard: if somehow from > till (bad data), skip
        if rec.effective_from > till:
            continue
        days = _days_in_period(rec.effective_from, till)
        period_payable = _prorated_salary(rec.base_salary, days)
        total_payable += period_payable
        history.append({
            "id": rec.id,
            "base_salary": rec.base_salary,
            "effective_from": rec.effective_from,
            "effective_till": rec.effective_till,
            "days": days,
            "period_payable": period_payable,
        })

    # Latest record metadata
    latest = salary_records[-1]

    # 3. Fetch cumulative allowances and deductions
    # Adjust model/field names to match your actual SalaryLedger schema
    allowance_stmt = select(func.coalesce(func.sum(SalaryLedger.allowance), 0)).where(
        SalaryLedger.teacher_id == teacher_id
    )
    deduction_stmt = select(func.coalesce(func.sum(SalaryLedger.deduction), 0)).where(
        SalaryLedger.teacher_id == teacher_id
    )
    total_allowance = session.scalar(allowance_stmt) or 0.0
    total_deduction = session.scalar(deduction_stmt) or 0.0

    # 4. Fetch total paid
    paid_stmt = select(func.coalesce(func.sum(SalaryPayment.amount), 0)).where(
        SalaryPayment.teacher_id == teacher_id
    )
    total_paid = session.scalar(paid_stmt) or 0.0

    # 5. Final calculations
    total_net_salary = total_payable + total_allowance - total_deduction
    remaining = round(total_net_salary - total_paid, 2)

    return {
        "teacher_id": teacher_id,
        "current_base_salary": latest.base_salary,
        "latest_effective_from": latest.effective_from,
        "total_payable": round(total_payable, 2),
        "total_allowance": round(total_allowance, 2),
        "total_deduction": round(total_deduction, 2),
        "total_net_salary": round(total_net_salary, 2),
        "total_paid": round(total_paid, 2),
        "remaining": remaining,
        "salary_history": history,
    }


def _empty_summary(teacher_id: int) -> dict:
    return {
        "teacher_id": teacher_id,
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
```

---

## 4. Backend — Router

```python
# routers/salary.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import timedelta

from db import get_session
from models.salary import TeacherSalary
from models.teacher import Teacher
from schemas.salary import TeacherSalaryCreate, TeacherSalaryUpdate
from services.salary_service import (
    close_previous_active_record,
    reconnect_neighbors_after_delete,
    recalculate_all_effective_till,
    calculate_teacher_salary_summary,
)

router = APIRouter(prefix="/salary", tags=["salary"])


# ── GET /salary/teacher-summary/{teacher_id} ───────────────────────────────

@router.get("/teacher-summary/{teacher_id}")
def get_teacher_salary_summary(
    teacher_id: int,
    session: Session = Depends(get_session),
):
    teacher = session.get(Teacher, teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    summary = calculate_teacher_salary_summary(session, teacher_id)
    summary["teacher_name"] = teacher.name  # adjust to your field name
    return summary


# ── GET /salary/set-salary (for Set Salary page — shows all teachers) ──────

@router.get("/set-salary")
def get_all_salaries(session: Session = Depends(get_session)):
    """
    Returns all salary records with effective_till populated.
    Used to render the Set Salary table.
    """
    from datetime import date
    stmt = select(TeacherSalary, Teacher).join(Teacher)
    results = session.exec(stmt).all()

    rows = []
    for salary, teacher in results:
        rows.append({
            "id": salary.id,
            "teacher_id": salary.teacher_id,
            "teacher_name": teacher.name,
            "base_salary": salary.base_salary,
            "effective_from": salary.effective_from,
            "effective_till": salary.effective_till,  # NULL = currently active
        })
    return rows


# ── POST /salary — create new salary record ────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_salary(
    payload: TeacherSalaryCreate,
    session: Session = Depends(get_session),
):
    # 1. Validate: no overlapping active record with same effective_from
    existing = session.exec(
        select(TeacherSalary)
        .where(TeacherSalary.teacher_id == payload.teacher_id)
        .where(TeacherSalary.effective_from == payload.effective_from)
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A salary record with the same effective_from already exists."
        )

    # 2. Close the current active record
    close_previous_active_record(session, payload.teacher_id, payload.effective_from)

    # 3. Create new record (effective_till = NULL = open-ended)
    new_salary = TeacherSalary(
        teacher_id=payload.teacher_id,
        base_salary=payload.base_salary,
        effective_from=payload.effective_from,
        effective_till=None,
    )
    session.add(new_salary)
    session.commit()
    session.refresh(new_salary)
    return new_salary


# ── PUT /salary/{salary_id} — edit salary record ───────────────────────────

@router.put("/{salary_id}")
def update_salary(
    salary_id: int,
    payload: TeacherSalaryUpdate,
    session: Session = Depends(get_session),
):
    record = session.get(TeacherSalary, salary_id)
    if not record:
        raise HTTPException(status_code=404, detail="Salary record not found")

    # Apply changes
    if payload.base_salary is not None:
        record.base_salary = payload.base_salary
    if payload.effective_from is not None:
        record.effective_from = payload.effective_from

    session.add(record)

    # Recalculate ALL effective_till values for this teacher's timeline
    recalculate_all_effective_till(session, record.teacher_id)

    session.commit()
    session.refresh(record)
    return record


# ── DELETE /salary/{salary_id} ─────────────────────────────────────────────

@router.delete("/{salary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_salary(
    salary_id: int,
    session: Session = Depends(get_session),
):
    record = session.get(TeacherSalary, salary_id)
    if not record:
        raise HTTPException(status_code=404, detail="Salary record not found")

    # Reconnect neighboring periods BEFORE deleting
    reconnect_neighbors_after_delete(session, record)

    session.delete(record)
    session.commit()
```

---

## 5. Validation Guards

Add these in the POST and PUT handlers (or as a shared helper):

```python
def validate_salary_timeline(session: Session, teacher_id: int, exclude_id: int = None):
    """
    Ensures:
      1. No two records share the same effective_from.
      2. No overlapping periods (effective_from <= effective_till across records).
      3. Only one open-ended (effective_till = NULL) record exists.
    """
    stmt = (
        select(TeacherSalary)
        .where(TeacherSalary.teacher_id == teacher_id)
        .order_by(TeacherSalary.effective_from.asc())
    )
    if exclude_id:
        stmt = stmt.where(TeacherSalary.id != exclude_id)

    records = session.exec(stmt).all()

    open_ended_count = sum(1 for r in records if r.effective_till is None)
    if open_ended_count > 1:
        raise HTTPException(
            status_code=400,
            detail="Only one active (open-ended) salary record is allowed per teacher."
        )

    for i in range(len(records) - 1):
        curr = records[i]
        nxt = records[i + 1]
        if curr.effective_till is not None and curr.effective_till >= nxt.effective_from:
            raise HTTPException(
                status_code=400,
                detail=f"Overlapping salary periods detected between records {curr.id} and {nxt.id}."
            )
```

---

## 6. Frontend — Type Definitions

```typescript
// types/salary.ts

export interface SalaryPeriod {
  id: number;
  base_salary: number;
  effective_from: string;        // ISO date string "YYYY-MM-DD"
  effective_till: string | null; // null = currently active
  days: number;
  period_payable: number;
}

export interface TeacherSalarySummary {
  teacher_id: number;
  teacher_name: string;
  current_base_salary: number;
  latest_effective_from: string;
  total_payable: number;
  total_allowance: number;
  total_deduction: number;
  total_net_salary: number;
  total_paid: number;
  remaining: number;
  salary_history: SalaryPeriod[];
}

export interface SetSalaryRow {
  id: number;
  teacher_id: number;
  teacher_name: string;
  base_salary: number;
  effective_from: string;
  effective_till: string | null;
}
```

---

## 7. Frontend — API Functions

```typescript
// lib/api/salary.ts
import axios from "@/lib/axios"; // your configured axios instance

export const getSalarySetList = async (): Promise<SetSalaryRow[]> => {
  const { data } = await axios.get("/salary/set-salary");
  return data;
};

export const getTeacherSalarySummary = async (
  teacherId: number
): Promise<TeacherSalarySummary> => {
  const { data } = await axios.get(`/salary/teacher-summary/${teacherId}`);
  return data;
};

export const createSalary = async (payload: {
  teacher_id: number;
  base_salary: number;
  effective_from: string;
}) => {
  const { data } = await axios.post("/salary/", payload);
  return data;
};

export const updateSalary = async (
  salaryId: number,
  payload: { base_salary?: number; effective_from?: string }
) => {
  const { data } = await axios.put(`/salary/${salaryId}`, payload);
  return data;
};

export const deleteSalary = async (salaryId: number) => {
  await axios.delete(`/salary/${salaryId}`);
};
```

---

## 8. Frontend — Set Salary Page

```tsx
// app/(dashboard)/salary/set-salary/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSalarySetList, deleteSalary } from "@/lib/api/salary";
import { SetSalaryRow } from "@/types/salary";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import EditSalaryModal from "./_components/EditSalaryModal";
import AddSalaryModal from "./_components/AddSalaryModal";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal";

export default function SetSalaryPage() {
  const [rows, setRows] = useState<SetSalaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<SetSalaryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SetSalaryRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getSalarySetList();
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteSalary(deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Set Salary</h1>
        <Button onClick={() => setShowAdd(true)}>+ Add Salary</Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-y-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Teacher Name</th>
                <th className="px-4 py-3 text-left font-medium">Base Salary</th>
                <th className="px-4 py-3 text-left font-medium">Effective From</th>
                <th className="px-4 py-3 text-left font-medium">Effective Till</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} className="border-t hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{row.teacher_name}</td>
                  <td className="px-4 py-3">{formatCurrency(row.base_salary)}</td>
                  <td className="px-4 py-3">{formatDate(row.effective_from)}</td>
                  <td className="px-4 py-3">
                    {row.effective_till ? formatDate(row.effective_till) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row.effective_till === null ? (
                      <Badge variant="default" className="bg-green-100 text-green-700">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Closed</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditTarget(row)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteTarget(row)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    No salary records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <AddSalaryModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); load(); }}
        />
      )}
      {editTarget && (
        <EditSalaryModal
          record={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => { setEditTarget(null); load(); }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Salary Record"
          description={`Delete ${formatCurrency(deleteTarget.base_salary)} effective from ${formatDate(deleteTarget.effective_from)} for ${deleteTarget.teacher_name}? Neighboring periods will be reconnected automatically.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
```

---

## 9. Frontend — View Salary Page

```tsx
// app/(dashboard)/salary/view-salary/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getTeacherSalarySummary } from "@/lib/api/salary";
import { TeacherSalarySummary } from "@/types/salary";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import axios from "@/lib/axios";

// You may fetch the teacher list differently — adjust to your existing pattern
async function getAllTeachers(): Promise<{ id: number; name: string }[]> {
  const { data } = await axios.get("/teachers");
  return data;
}

export default function ViewSalaryPage() {
  const [teachers, setTeachers] = useState<{ id: number; name: string }[]>([]);
  const [summaries, setSummaries] = useState<TeacherSalarySummary[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const teacherList = await getAllTeachers();
        setTeachers(teacherList);
        const allSummaries = await Promise.all(
          teacherList.map((t) => getTeacherSalarySummary(t.id))
        );
        setSummaries(allSummaries);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground">Loading salary data…</div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">View Salary</h1>

      <div className="rounded-md border overflow-hidden">
        {/* ── Main header ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-8"></th>
                <th className="px-4 py-3 text-left font-medium">Teacher Name</th>
                <th className="px-4 py-3 text-left font-medium">Base Salary</th>
                <th className="px-4 py-3 text-left font-medium">
                  Effective Date (Latest)
                </th>
                <th className="px-4 py-3 text-right font-medium">Total Payable</th>
                <th className="px-4 py-3 text-right font-medium">Allowance</th>
                <th className="px-4 py-3 text-right font-medium">Deduction</th>
                <th className="px-4 py-3 text-right font-medium">Net Salary</th>
                <th className="px-4 py-3 text-right font-medium">Paid</th>
                <th className="px-4 py-3 text-right font-medium">Remaining</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <>
                  {/* ── Summary row ── */}
                  <tr
                    key={summary.teacher_id}
                    className="border-t hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() =>
                      setExpanded(
                        expanded === summary.teacher_id ? null : summary.teacher_id
                      )
                    }
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {expanded === summary.teacher_id ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{summary.teacher_name}</td>
                    <td className="px-4 py-3">
                      {formatCurrency(summary.current_base_salary)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(summary.latest_effective_from)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(summary.total_payable)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      +{formatCurrency(summary.total_allowance)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      -{formatCurrency(summary.total_deduction)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(summary.total_net_salary)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(summary.total_paid)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          summary.remaining > 0
                            ? "text-amber-600 font-semibold"
                            : "text-green-600 font-semibold"
                        }
                      >
                        {formatCurrency(summary.remaining)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          // navigate to payment page or open payment modal
                        }}
                      >
                        Pay
                      </Button>
                    </td>
                  </tr>

                  {/* ── Expanded: salary history breakdown ── */}
                  {expanded === summary.teacher_id && (
                    <tr key={`${summary.teacher_id}-history`} className="bg-muted/20">
                      <td colSpan={11} className="px-8 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          Salary Period Breakdown
                        </p>
                        <table className="w-full text-xs border rounded overflow-hidden">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-3 py-2 text-left">Period</th>
                              <th className="px-3 py-2 text-left">Base Salary</th>
                              <th className="px-3 py-2 text-right">Days</th>
                              <th className="px-3 py-2 text-right">Period Payable</th>
                              <th className="px-3 py-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.salary_history.map((period) => (
                              <tr
                                key={period.id}
                                className="border-t hover:bg-muted/40"
                              >
                                <td className="px-3 py-2">
                                  {formatDate(period.effective_from)} →{" "}
                                  {period.effective_till
                                    ? formatDate(period.effective_till)
                                    : "Today"}
                                </td>
                                <td className="px-3 py-2">
                                  {formatCurrency(period.base_salary)}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {period.days}
                                </td>
                                <td className="px-3 py-2 text-right font-medium">
                                  {formatCurrency(period.period_payable)}
                                </td>
                                <td className="px-3 py-2">
                                  {period.effective_till === null ? (
                                    <span className="text-green-600 font-medium">
                                      Active
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      Closed
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-muted font-semibold">
                            <tr>
                              <td colSpan={3} className="px-3 py-2">
                                Total Payable (all periods)
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(summary.total_payable)}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}

              {summaries.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No salary data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

---

## 10. Utility Helpers

```typescript
// lib/utils/format.ts (add if not already present)

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
```

---

## 11. Implementation Checklist

### Backend
- [ ] Add `effective_till` column to `TeacherSalary` model
- [ ] Write and run Alembic migration (backfills existing data)
- [ ] Create `salary_service.py` with all helper functions
- [ ] Add `GET /salary/teacher-summary/{teacher_id}` endpoint
- [ ] Update `POST /salary/` to call `close_previous_active_record()`
- [ ] Update `PUT /salary/{id}` to call `recalculate_all_effective_till()`
- [ ] Update `DELETE /salary/{id}` to call `reconnect_neighbors_after_delete()`
- [ ] Add validation guards (overlap prevention, single active record)
- [ ] Adjust model names (`SalaryLedger`, `SalaryPayment`) to match your codebase

### Frontend
- [ ] Add `SalaryPeriod`, `TeacherSalarySummary`, `SetSalaryRow` types
- [ ] Add API functions in `lib/api/salary.ts`
- [ ] Add `formatDate` / `formatCurrency` utilities if not present
- [ ] Update Set Salary page — add `Effective Till` and `Status` columns
- [ ] Update View Salary page — rename column, use new endpoint, add history expansion
- [ ] Wire up `AddSalaryModal` and `EditSalaryModal` (adjust to your existing modal pattern)

---

## 12. Key Calculation Example — Verification

Given:
- Salary 1: Rs. 30,000 | From: 01-Jan-2026 | Till: 14-Mar-2026
- Salary 2: Rs. 40,000 | From: 15-Mar-2026 | Till: NULL (today = 21-May-2026)

**Period 1:** Jan 01 → Mar 14 = 73 days
  - Daily rate = 30,000 / 30 = Rs. 1,000/day
  - Payable = 73 × 1,000 = **Rs. 73,000**

**Period 2:** Mar 15 → May 21 = 68 days
  - Daily rate = 40,000 / 30 = Rs. 1,333.33/day
  - Payable = 68 × 1,333.33 = **Rs. 90,666.67**

**Total Payable = Rs. 1,63,666.67**

If Rs. 20,000 was paid → Remaining = 1,63,666.67 − 20,000 = **Rs. 1,43,666.67**

This is the correct behaviour — the old Rs. 20,000 payment is NOT subtracted from the wrong salary basis.
