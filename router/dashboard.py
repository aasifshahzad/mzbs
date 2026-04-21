from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlmodel import Session, select, func
from datetime import datetime, date, timedelta
from db import get_session
from schemas.dashboard_model import (
    UserLoginSummary, AttendanceSummary, StudentSummary,
    IncomeExpenseCategorySummary, LoginGraphData, AttendanceGraphData,
    StudentGraphData, CategoryGraphData, GraphData, Dataset
)
from user.user_models import User
from schemas.attendance_model import Attendance, AttendanceValue
from schemas.students_model import Students
from schemas.class_names_model import ClassNames
from schemas.income_model import Income
from schemas.expense_model import Expense
from schemas.fee_model import Fee
from user.user_crud import get_current_user
from typing import Annotated, List

dashboard_router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    responses={404: {"description": "Not found"}},
    dependencies=[Depends(get_current_user)],
)


# ─────────────────────────────────────────────────────────────────────────────
# /dashboard/user-roles
# ─────────────────────────────────────────────────────────────────────────────

@dashboard_router.get("/user-roles", response_model=LoginGraphData)
def get_user_role_summary(session: Session = Depends(get_session)):
    """Fetch user role distribution summary. Requires auth."""
    try:
        stmt = select(User.role, func.count(User.role).label("role_count")).group_by(User.role)
        result = session.exec(stmt).all()

        role_counts = {}
        for role_obj, cnt in result:
            if role_obj is None:
                continue
            raw = role_obj.name if hasattr(role_obj, "name") else str(role_obj)
            key = raw.split(".")[-1].upper()
            role_counts[key] = int(cnt)

        from user.user_models import UserRole
        for r in UserRole:
            role_counts.setdefault(r.name, 0)

        overrides = {"FEE_MANAGER": "Fee Manager"}
        def human_label(k: str) -> str:
            return overrides.get(k, k.replace("_", " ").title())

        role_mapping = {k: human_label(k) for k in role_counts.keys()}
        sorted_roles = sorted(role_counts.items(), key=lambda x: x[1], reverse=True)
        summary = [UserLoginSummary(Roll=role_mapping[k], Total=count) for k, count in sorted_roles]
        labels = [role_mapping[k] for k, _ in sorted_roles]
        values = [float(count) for _, count in sorted_roles]

        palette = [
            "rgba(255, 99, 132, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(255, 159, 64, 1)",
            "rgba(153, 102, 255, 1)",
            "rgba(201, 203, 207, 1)"
        ]
        bg_colors = [palette[i % len(palette)] for i in range(len(labels))]

        graph_data = GraphData(
            labels=labels,
            datasets=[Dataset(
                label="Total",
                data=values,
                backgroundColor=bg_colors,
                borderColor="rgba(0, 0, 0, 1)",
                borderWidth=2
            )],
            title="Total Users Role Wise",
        )
        return LoginGraphData(summary=summary, graph=graph_data)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user role summary: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# /dashboard/attendance-summary
# BUG 1 FIXED: was using undefined `today` variable instead of `selected_date`
# BUG 2 FIXED: GraphData was passed `options={}` but model didn't accept it
# ─────────────────────────────────────────────────────────────────────────────

@dashboard_router.get("/attendance-summary", response_model=AttendanceGraphData)
def get_attendance_summary(
    date: date = Query(default=None),
    session: Session = Depends(get_session)
):
    """Fetch class-wise attendance summary for a given date. Defaults to today."""
    try:
        # FIX 1: use `selected_date` consistently — `today` was never defined
        selected_date = date if date else datetime.now().date()

        print(f"[attendance-summary] Querying for date: {selected_date}")

        # First, get total student count and marked count
        total_students = session.exec(select(func.count(Students.student_id))).first() or 0
        
        # Students who have attendance marked for this date
        marked_count = session.exec(
            select(func.count(func.distinct(Attendance.student_id)))
            .where(func.date(Attendance.attendance_date) == selected_date)
        ).first() or 0
        
        unmarked_count = max(0, total_students - marked_count)

        # FIX: Always start with ALL classes to ensure all are shown
        # Get all classes first
        all_classes = session.exec(select(ClassNames)).all()
        
        # Initialize class_data with all classes
        class_data = {
            c.class_name_id: {
                "date": str(selected_date),
                "class_name": c.class_name,
                "attendance_values": {
                    "present": 0,
                    "absent": 0,
                    "late": 0,
                    "leave": 0,
                    "unmarked": 0,
                }
            }
            for c in all_classes
        }
        
        # Get attendance records grouped by class and status
        stmt = (
            select(
                ClassNames.class_name_id,
                ClassNames.class_name,
                AttendanceValue.attendance_value,
                func.count(Attendance.attendance_id).label("count")
            )
            .join(ClassNames, Attendance.class_name_id == ClassNames.class_name_id)
            .join(AttendanceValue, Attendance.attendance_value_id == AttendanceValue.attendance_value_id)
            .where(func.date(Attendance.attendance_date) == selected_date)
            .group_by(ClassNames.class_name_id, ClassNames.class_name, AttendanceValue.attendance_value)
        )

        result = session.exec(stmt).all()
        print(f"[attendance-summary] Found {len(result)} attendance records")
        print(f"[attendance-summary] Total classes: {len(class_data)}")

        # Populate with attendance records
        for class_id, class_name, value, count in result:
            norm_value = value.lower() if value else "unknown"
            if norm_value in class_data[class_id]["attendance_values"]:
                class_data[class_id]["attendance_values"][norm_value] = count
        
        # Add unmarked count to each class
        for class_id in class_data:
            class_data[class_id]["attendance_values"]["unmarked"] = unmarked_count

        summary = [AttendanceSummary(**data) for data in class_data.values()]

        colors = {
            "present": "rgba(75, 192, 192, 1)",
            "absent":  "rgba(255, 99, 132, 1)",
            "late":    "rgba(255, 206, 86, 1)",
            "leave":   "rgba(255, 159, 64, 1)",
            "unmarked": "rgba(201, 203, 207, 1)",
        }

        # Sort by class_name_id for consistent ordering
        sorted_class_ids = sorted(class_data.keys())

        # Collect all attendance types that actually appear
        attendance_types: set = set()
        for data in class_data.values():
            attendance_types.update(data["attendance_values"].keys())

        datasets = []
        for att_type in sorted(attendance_types):
            datasets.append(Dataset(
                label=att_type.capitalize(),
                data=[
                    float(class_data[cid]["attendance_values"].get(att_type, 0))
                    for cid in sorted_class_ids
                ],
                backgroundColor=colors.get(att_type, "rgba(201, 203, 207, 1)")
            ))

        # FIX 2: removed `options={}` — GraphData now accepts it as Optional
        graph_data = GraphData(
            labels=[class_data[cid]["class_name"] for cid in sorted_class_ids],
            datasets=datasets,
            title=f"Attendance Summary for {selected_date} (Total: {total_students})",
        )

        return AttendanceGraphData(summary=summary, graph=graph_data)

    except Exception as e:
        print(f"[attendance-summary] ERROR: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching attendance summary: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# /dashboard/student-summary
# BUG 3 FIXED: backgroundColor list had only 4 colours for 5 labels (Unmarked missing)
# BUG 4 FIXED: total_students calculated by ID range — replaced with COUNT(*)
# ─────────────────────────────────────────────────────────────────────────────

@dashboard_router.get("/student-summary", response_model=StudentGraphData)
def get_student_summary(
    date: date = Query(default=None),
    session: Session = Depends(get_session)
):
    """Fetch school-wide attendance distribution for a given date. Defaults to today."""
    try:
        selected_date = date if date else datetime.now().date()

        # FIX 4: COUNT(*) is correct — ID-range breaks when students are deleted
        # Use session.scalar() instead of session.exec() for aggregate queries
        # session.exec() is SQLModel's ORM wrapper and doesn't handle COUNT() well
        total_students = session.scalar(select(func.count()).select_from(Students)) or 0

        # Students who have attendance marked for this date
        marked_count = session.exec(
            select(func.count(func.distinct(Attendance.student_id)))
            .where(func.date(Attendance.attendance_date) == selected_date)
        ).first() or 0

        unmarked_count = max(0, total_students - marked_count)

        # Per-status counts
        default_values = {
            "Present": 0,
            "Absent": 0,
            "Late": 0,
            "Leave": 0,
            "Unmarked": unmarked_count,
        }

        attendance_counts = session.exec(
            select(
                AttendanceValue.attendance_value,
                func.count(Attendance.attendance_id).label("count")
            )
            .join(Attendance, AttendanceValue.attendance_value_id == Attendance.attendance_value_id)
            .where(func.date(Attendance.attendance_date) == selected_date)
            .group_by(AttendanceValue.attendance_value)
        ).all()

        for value, count in attendance_counts:
            # Match case-insensitively against our keys
            for key in default_values:
                if key.lower() == (value or "").lower():
                    default_values[key] = int(count)
                    break

        summary = StudentSummary(
            total_students=total_students,
            present=default_values["Present"],
            absent=default_values["Absent"],
            late=default_values["Late"],
            leave=default_values["Leave"],
        )

        # FIX 3: 5 colours for 5 labels (Unmarked was missing, causing index error)
        graph_data = GraphData(
            labels=list(default_values.keys()),
            datasets=[Dataset(
                label=f"Student Attendance — {selected_date} (Total: {total_students})",
                data=[float(v) for v in default_values.values()],
                backgroundColor=[
                    "rgba(75, 192, 192, 0.8)",   # Present  — teal
                    "rgba(255, 99, 132, 0.8)",   # Absent   — red
                    "rgba(255, 206, 86, 0.8)",   # Late     — yellow
                    "rgba(255, 159, 64, 0.8)",   # Leave    — orange
                    "rgba(201, 203, 207, 0.8)",  # Unmarked — grey  ← was missing
                ],
                borderColor=[
                    "rgba(75, 192, 192, 1)",
                    "rgba(255, 99, 132, 1)",
                    "rgba(255, 206, 86, 1)",
                    "rgba(255, 159, 64, 1)",
                    "rgba(201, 203, 207, 1)",    # ← was missing
                ],
                borderWidth=1
            )],
            title=f"Student Attendance Distribution for {selected_date}"
        )

        return StudentGraphData(summary=summary, graph=graph_data)

    except Exception as e:
        print(f"[student-summary] ERROR for date {date}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching student summary: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# /dashboard/total-students
# ─────────────────────────────────────────────────────────────────────────────

@dashboard_router.get("/total-students", response_model=int)
def get_total_students(session: Session = Depends(get_session)):
    """Get total number of active students."""
    try:
        # Use session.scalar() instead of session.exec() for aggregate queries
        # session.exec() is SQLModel's ORM wrapper and doesn't handle COUNT() well
        total = session.scalar(select(func.count()).select_from(Students)) or 0
        return int(total)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching total students: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# /dashboard/unmarked-students
# ─────────────────────────────────────────────────────────────────────────────

@dashboard_router.get("/unmarked-students", response_model=List[int])
def get_unmarked_students(
    date: date = Query(default=None),
    session: Session = Depends(get_session)
):
    """Get student IDs with no attendance record for a given date."""
    try:
        selected_date = date if date else datetime.now().date()

        all_students = session.exec(
            select(Students.student_id).order_by(Students.student_id)
        ).all()

        marked_students = session.exec(
            select(Attendance.student_id)
            .where(func.date(Attendance.attendance_date) == selected_date)
            .distinct()
        ).all()

        unmarked = sorted(list(set(all_students) - set(marked_students)))
        return unmarked

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding unmarked students: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# /dashboard/income-summary
# ─────────────────────────────────────────────────────────────────────────────

@dashboard_router.get("/income-summary", response_model=CategoryGraphData)
def get_income_summary(
    year: int = Query(default=datetime.now().year),
    month: int = Query(default=None),
    session: Session = Depends(get_session)
):
    """Fetch income summary by category. Filter by year and optionally month."""
    try:
        from schemas.income_cat_names_model import IncomeCatNames
        all_cats = session.exec(select(IncomeCatNames)).all()
        cat_id_to_name = {cat.income_cat_name_id: cat.income_cat_name for cat in all_cats}
        categories = list(cat_id_to_name.values())

        stmt = select(
            Income.category_id,
            func.sum(Income.amount).label("total_amount")
        ).where(func.extract("year", Income.date) == year)
        if month:
            stmt = stmt.where(func.extract("month", Income.date) == month)
        stmt = stmt.group_by(Income.category_id).order_by(Income.category_id)

        result = session.exec(stmt).all()

        category_summary = {cat_name: 0.0 for cat_name in categories}
        for row in result:
            cat_name = cat_id_to_name.get(row.category_id, f"Unknown-{row.category_id}")
            category_summary[cat_name] = float(row.total_amount or 0)
        amounts = [category_summary[cat] for cat in categories]

        label_suffix = f"{year}" + (f"-{month:02d}" if month else "")
        graph_data = GraphData(
            labels=categories,
            datasets=[Dataset(
                label=f"Income by Category ({label_suffix})",
                data=amounts,
                backgroundColor="rgba(0, 200, 83, 0.7)",
                borderColor="rgba(0, 200, 83, 1)",
                borderWidth=1
            )],
            title=f"Income Category Details for {label_suffix}",
        )

        return CategoryGraphData(
            summary=[IncomeExpenseCategorySummary(
                year=year,
                month=month or 0,
                category_summary=category_summary
            )],
            graph=graph_data,
            total=sum(amounts)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching income summary: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# /dashboard/expense-summary
# ─────────────────────────────────────────────────────────────────────────────

@dashboard_router.get("/expense-summary", response_model=CategoryGraphData)
def get_expense_summary(
    year: int = Query(default=datetime.now().year),
    month: int = Query(default=None),
    session: Session = Depends(get_session)
):
    """Fetch expense summary by category. Filter by year and optionally month."""
    try:
        from schemas.expense_cat_names_model import ExpenseCatNames
        all_cats = session.exec(select(ExpenseCatNames)).all()
        cat_id_to_name = {cat.expense_cat_name_id: cat.expense_cat_name for cat in all_cats}
        categories = list(cat_id_to_name.values())

        stmt = select(
            Expense.category_id,
            func.sum(Expense.amount).label("total_amount")
        ).where(func.extract("year", Expense.date) == year)
        if month:
            stmt = stmt.where(func.extract("month", Expense.date) == month)
        stmt = stmt.group_by(Expense.category_id).order_by(Expense.category_id)

        result = session.exec(stmt).all()

        category_summary = {cat_name: 0.0 for cat_name in categories}
        for row in result:
            cat_name = cat_id_to_name.get(row.category_id, f"Unknown-{row.category_id}")
            category_summary[cat_name] = float(row.total_amount or 0)
        amounts = [category_summary[cat] for cat in categories]

        label_suffix = f"{year}" + (f"-{month:02d}" if month else "")
        graph_data = GraphData(
            labels=categories,
            datasets=[Dataset(
                label=f"Expense by Category ({label_suffix})",
                data=amounts,
                backgroundColor="rgba(244, 67, 54, 0.7)",
                borderColor="rgba(244, 67, 54, 1)",
                borderWidth=1
            )],
            title=f"Expense Category Details for {label_suffix}",
        )

        return CategoryGraphData(
            summary=[IncomeExpenseCategorySummary(
                year=year,
                month=month or 0,
                category_summary=category_summary
            )],
            graph=graph_data,
            total=sum(amounts)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching expense summary: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# /dashboard/income-expense-summary
# ─────────────────────────────────────────────────────────────────────────────

@dashboard_router.get("/income-expense-summary")
def get_income_expense_summary(
    year: int = Query(default=datetime.now().year),
    session: Session = Depends(get_session)
):
    """Get combined income vs expense vs profit/loss for every month of a year."""
    try:
        income_stmt = (
            select(
                func.extract('month', Income.date).label('month'),
                func.sum(Income.amount).label("total_amount")
            )
            .where(func.extract("year", Income.date) == year)
            .group_by(func.extract('month', Income.date))
            .order_by('month')
        )
        income_result = session.exec(income_stmt).all()

        expense_stmt = (
            select(
                func.extract('month', Expense.date).label('month'),
                func.sum(Expense.amount).label("total_amount")
            )
            .where(func.extract("year", Expense.date) == year)
            .group_by(func.extract('month', Expense.date))
            .order_by('month')
        )
        expense_result = session.exec(expense_stmt).all()

        month_summary = {i: {"income": 0.0, "expense": 0.0, "profit": 0.0} for i in range(1, 13)}
        for row in income_result:
            month_summary[int(row.month)]["income"] = float(row.total_amount or 0)
        for row in expense_result:
            month_summary[int(row.month)]["expense"] = float(row.total_amount or 0)
        for m in month_summary:
            month_summary[m]["profit"] = month_summary[m]["income"] - month_summary[m]["expense"]

        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        profit_colors = [
            "rgba(33, 150, 243, 0.7)" if month_summary[i]["profit"] > 0
            else "rgba(255, 152, 0, 0.7)" if month_summary[i]["profit"] < 0
            else "rgba(201, 203, 207, 0.7)"
            for i in range(1, 13)
        ]

        graph = GraphData(
            labels=month_names,
            datasets=[
                Dataset(
                    label="Income",
                    data=[month_summary[i]["income"] for i in range(1, 13)],
                    backgroundColor="rgba(0, 200, 83, 0.7)",
                    borderColor="rgba(0, 200, 83, 1)",
                    borderWidth=1
                ),
                Dataset(
                    label="Expense",
                    data=[month_summary[i]["expense"] for i in range(1, 13)],
                    backgroundColor="rgba(244, 67, 54, 0.7)",
                    borderColor="rgba(244, 67, 54, 1)",
                    borderWidth=1
                ),
                Dataset(
                    label="Profit/Loss",
                    data=[month_summary[i]["profit"] for i in range(1, 13)],
                    backgroundColor=profit_colors,
                    borderColor=profit_colors,
                    borderWidth=1
                ),
            ],
            title=f"Financial Summary for {year}",
        )

        return {
            "year": year,
            "monthly_data": month_summary,
            "month_names": month_names,
            "totals": {
                "income":  sum(m["income"]  for m in month_summary.values()),
                "expense": sum(m["expense"] for m in month_summary.values()),
                "profit":  sum(m["profit"]  for m in month_summary.values()),
            },
            "graph": graph,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching financial summary: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# /dashboard/fee-summary
# ─────────────────────────────────────────────────────────────────────────────

@dashboard_router.get("/fee-summary")
def get_fee_summary(
    year: int = Query(default=datetime.now().year),
    session: Session = Depends(get_session)
):
    """Get monthly fee collection summary for a given year."""
    try:
        current_year = datetime.now().year
        if year < 2000 or year > current_year + 5:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid year: {year}. Must be between 2000 and {current_year + 5}."
            )

        stmt = (
            select(
                func.extract('month', Fee.created_at).label('month'),
                func.coalesce(func.sum(Fee.fee_amount), 0).label("total_amount")
            )
            .where(func.extract("year", Fee.created_at) == year)
            .group_by(func.extract('month', Fee.created_at))
            .order_by('month')
        )
        result = session.exec(stmt).all()

        month_summary = {i: 0.0 for i in range(1, 13)}
        for row in result:
            if row.month is not None and 1 <= int(row.month) <= 12:
                month_summary[int(row.month)] = float(row.total_amount or 0)

        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        total = sum(month_summary.values())

        graph = GraphData(
            labels=month_names,
            datasets=[Dataset(
                label=f"Monthly Fee Collection for {year}",
                data=list(month_summary.values()),
                backgroundColor="rgba(168, 85, 247, 0.7)",
                borderColor="rgba(168, 85, 247, 1)",
                borderWidth=1
            )],
            title=f"Fee Collection Summary for {year}" + (" (No Data)" if total == 0 else ""),
        )

        return {
            "year": year,
            "monthly_data": month_summary,
            "total": total,
            "graph": graph,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[fee-summary] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching fee summary: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# /dashboard/graph-test  (HTML debug page — unchanged)
# ─────────────────────────────────────────────────────────────────────────────

@dashboard_router.get("/graph-test", response_class=HTMLResponse)
async def get_graph_test(session: Session = Depends(get_session)):
    return """
    <!DOCTYPE html>
    <html>
        <head>
            <title>Dashboard Graphs</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                .chart-container { margin: 20px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
                h2 { text-align: center; color: #333; }
            </style>
        </head>
        <body>
            <div style="width: 900px; margin: 20px auto;">
                <div class="chart-container">
                    <h2>Total Users Roll Wise</h2>
                    <canvas id="userRolesChart"></canvas>
                </div>
                <div class="chart-container">
                    <h2>Student Attendance Overview</h2>
                    <div style="text-align: center; margin-bottom: 10px;">
                        <label>Date: <input type="date" id="attendanceDate"></label>
                        <button onclick="updateStudentChart()">Update</button>
                    </div>
                    <canvas id="studentChart"></canvas>
                </div>
                <div class="chart-container">
                    <h2>Class-wise Attendance</h2>
                    <div style="text-align: center; margin-bottom: 10px;">
                        <label>Date: <input type="date" id="classAttendanceDate"></label>
                        <button onclick="updateClassAttendanceChart()">Update</button>
                    </div>
                    <canvas id="attendanceChart"></canvas>
                </div>
                <div class="chart-container">
                    <h2>Financial Overview</h2>
                    <canvas id="financialChart"></canvas>
                </div>
                <div class="chart-container">
                    <h2>Fee Collection Overview</h2>
                    <canvas id="feeChart"></canvas>
                </div>
                <div class="chart-container">
                    <h2>Income Category Details</h2>
                    <div style="text-align: center; margin-bottom: 10px;">
                        <label>Year: <input type="number" id="incomeYear" min="2000" max="2100" style="width:80px"></label>
                        <label>Month:
                            <select id="incomeMonth">
                                <option value="">All</option>
                                <option value="1">Jan</option><option value="2">Feb</option>
                                <option value="3">Mar</option><option value="4">Apr</option>
                                <option value="5">May</option><option value="6">Jun</option>
                                <option value="7">Jul</option><option value="8">Aug</option>
                                <option value="9">Sep</option><option value="10">Oct</option>
                                <option value="11">Nov</option><option value="12">Dec</option>
                            </select>
                        </label>
                        <button onclick="updateIncomeCategoryChart()">Update</button>
                    </div>
                    <canvas id="incomeCategoryChart"></canvas>
                </div>
                <div class="chart-container">
                    <h2>Expense Category Details</h2>
                    <div style="text-align: center; margin-bottom: 10px;">
                        <label>Year: <input type="number" id="expenseYear" min="2000" max="2100" style="width:80px"></label>
                        <label>Month:
                            <select id="expenseMonth">
                                <option value="">All</option>
                                <option value="1">Jan</option><option value="2">Feb</option>
                                <option value="3">Mar</option><option value="4">Apr</option>
                                <option value="5">May</option><option value="6">Jun</option>
                                <option value="7">Jul</option><option value="8">Aug</option>
                                <option value="9">Sep</option><option value="10">Oct</option>
                                <option value="11">Nov</option><option value="12">Dec</option>
                            </select>
                        </label>
                        <button onclick="updateExpenseCategoryChart()">Update</button>
                    </div>
                    <canvas id="expenseCategoryChart"></canvas>
                </div>
            </div>
            <script>
                const charts = {};
                function destroyChart(id) { if (charts[id]) { charts[id].destroy(); charts[id] = null; } }

                async function updateStudentChart() {
                    const date = document.getElementById('attendanceDate').value;
                    if (!date) { alert('Please select a date'); return; }
                    try {
                        const res = await fetch(`/dashboard/student-summary?date=${date}`);
                        const data = await res.json();
                        destroyChart('student');
                        charts.student = new Chart(document.getElementById('studentChart'), {
                            type: 'bar', data: data.graph,
                            options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
                        });
                    } catch (e) { console.error(e); alert('Error updating chart.'); }
                }

                async function updateClassAttendanceChart() {
                    const date = document.getElementById('classAttendanceDate').value;
                    const url = date ? `/dashboard/attendance-summary?date=${date}` : '/dashboard/attendance-summary';
                    try {
                        const res = await fetch(url);
                        const data = await res.json();
                        destroyChart('attendance');
                        charts.attendance = new Chart(document.getElementById('attendanceChart'), {
                            type: 'bar', data: data.graph,
                            options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
                        });
                    } catch (e) { console.error(e); }
                }

                async function updateIncomeCategoryChart() {
                    const year = document.getElementById('incomeYear').value || new Date().getFullYear();
                    const month = document.getElementById('incomeMonth').value;
                    let url = `/dashboard/income-summary?year=${year}`;
                    if (month) url += `&month=${month}`;
                    try {
                        const res = await fetch(url);
                        const data = await res.json();
                        destroyChart('incomeCategory');
                        charts.incomeCategory = new Chart(document.getElementById('incomeCategoryChart'), {
                            type: 'bar', data: data.graph,
                            options: { responsive: true, scales: { y: { beginAtZero: true } } }
                        });
                    } catch (e) { console.error(e); }
                }

                async function updateExpenseCategoryChart() {
                    const year = document.getElementById('expenseYear').value || new Date().getFullYear();
                    const month = document.getElementById('expenseMonth').value;
                    let url = `/dashboard/expense-summary?year=${year}`;
                    if (month) url += `&month=${month}`;
                    try {
                        const res = await fetch(url);
                        const data = await res.json();
                        destroyChart('expenseCategory');
                        charts.expenseCategory = new Chart(document.getElementById('expenseCategoryChart'), {
                            type: 'bar', data: data.graph,
                            options: { responsive: true, scales: { y: { beginAtZero: true } } }
                        });
                    } catch (e) { console.error(e); }
                }

                async function fetchAndRenderGraphs() {
                    try {
                        const rolesRes = await fetch('/dashboard/user-roles');
                        const rolesData = await rolesRes.json();
                        destroyChart('userRoles');
                        charts.userRoles = new Chart(document.getElementById('userRolesChart'), {
                            type: 'bar', data: rolesData.graph,
                            options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
                        });

                        const year = new Date().getFullYear();
                        const today = new Date().toISOString().split('T')[0];
                        document.getElementById('attendanceDate').value = today;
                        document.getElementById('classAttendanceDate').value = today;
                        document.getElementById('incomeYear').value = year;
                        document.getElementById('expenseYear').value = year;

                        await updateStudentChart();
                        await updateClassAttendanceChart();

                        const financialRes = await fetch(`/dashboard/income-expense-summary?year=${year}`);
                        const financialData = await financialRes.json();
                        destroyChart('financial');
                        charts.financial = new Chart(document.getElementById('financialChart'), {
                            type: 'bar', data: financialData.graph,
                            options: { responsive: true, scales: { y: { beginAtZero: true } } }
                        });

                        const feeRes = await fetch(`/dashboard/fee-summary?year=${year}`);
                        const feeData = await feeRes.json();
                        destroyChart('fee');
                        charts.fee = new Chart(document.getElementById('feeChart'), {
                            type: 'bar', data: feeData.graph,
                            options: { responsive: true, scales: { y: { beginAtZero: true } } }
                        });

                        await updateIncomeCategoryChart();
                        await updateExpenseCategoryChart();
                    } catch (e) { console.error('Error fetching data:', e); }
                }

                fetchAndRenderGraphs();
            </script>
        </body>
    </html>
    """
