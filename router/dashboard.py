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
from user.user_models import User
from typing import Annotated, List

dashboard_router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    responses={404: {"description": "Not found"}},
    dependencies=[Depends(get_current_user)],
)


@dashboard_router.get("/user-roles", response_model=LoginGraphData)
def get_user_role_summary(session: Session = Depends(get_session)):
    """Fetch user role distribution summary (dynamic role mapping from DB, zero-fill using UserRole enum). Requires auth."""
    try:
        # counts from DB
        stmt = select(User.role, func.count(User.role).label("role_count")).group_by(User.role)
        result = session.exec(stmt).all()

        role_counts = {}
        for role_obj, cnt in result:
            if role_obj is None:
                continue
            raw = role_obj.name if hasattr(role_obj, "name") else str(role_obj)
            key = raw.split(".")[-1].upper()
            role_counts[key] = int(cnt)

        # Ensure every defined enum role appears (zero if absent)
        from user.user_models import UserRole
        for r in UserRole:
            role_counts.setdefault(r.name, 0)

        # Human friendly labels with optional overrides
        overrides = {"FEE_MANAGER": "Fee Manager"}
        def human_label(k: str) -> str:
            if k in overrides:
                return overrides[k]
            return k.replace("_", " ").title()

        role_mapping = {k: human_label(k) for k in role_counts.keys()}

        # Prepare summary and graph (sorted by count desc)
        sorted_roles = sorted(role_counts.items(), key=lambda x: x[1], reverse=True)
        summary = [UserLoginSummary(Roll=role_mapping[k], Total=count) for k, count in sorted_roles]
        labels = [role_mapping[k] for k, _ in sorted_roles]
        values = [count for _, count in sorted_roles]

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


@dashboard_router.get("/attendance-summary", response_model=AttendanceGraphData)
def get_attendance_summary(session: Session = Depends(get_session)):
    """Fetch today's attendance summary with graph visualization. Requires auth."""
    try:
        # Get today's date at start and end of day to ensure we catch all records
        today = datetime.utcnow().date()
        
        # Debug: Print the date we're querying for
        print(f"Querying attendance for date: {today}")
        
        # Modified query to join with ClassNames to get actual class names
        stmt = (
            select(
                ClassNames.class_name_id,
                ClassNames.class_name,
                AttendanceValue.attendance_value,
                func.count(Attendance.attendance_id).label("count")
            )
            .join(ClassNames, Attendance.class_name_id == ClassNames.class_name_id)
            .join(AttendanceValue, Attendance.attendance_value_id == AttendanceValue.attendance_value_id)
            .where(Attendance.attendance_date == today)
            .group_by(ClassNames.class_name_id, ClassNames.class_name, AttendanceValue.attendance_value)
        )
        
        result = session.exec(stmt).all()
        
        # Debug: Print the number of results
        print(f"Found {len(result)} attendance records")
        
        # If no results, create empty dataset with default values
        if not result:
            print("No attendance data found for today")
            # Create default empty data for all classes
            classes = session.exec(select(ClassNames)).all()
            
            class_data = {
                c.class_name_id: {
                    "date": str(today),
                    "class_name": c.class_name,
                    "attendance_values": {
                        "present": 0,
                        "absent": 0,
                        "late": 0,
    
                        "leave": 0
                    }
                } for c in classes
            }
        else:
            class_data = {}
            for class_id, class_name, value, count in result:
                if class_id not in class_data:
                    class_data[class_id] = {
                        "date": str(today),
                        "class_name": class_name,
                        "attendance_values": {}
                    }
                # Store with lowercase keys to match database values
                class_data[class_id]["attendance_values"][value.lower() if value else "unknown"] = count
        
        summary = [AttendanceSummary(**data) for data in class_data.values()]
        
        colors = {
            "present": "rgba(75, 192, 192, 1)",
            "absent": "rgba(255, 99, 132, 1)",
            "late": "rgba(255, 206, 86, 1)",

            "leave": "rgba(255, 159, 64, 1)"
        }
        
        labels = sorted(list(class_data.keys()))  # Sort class IDs numerically
        
        datasets = []
        attendance_types = set()
        
        for data in class_data.values():
            attendance_types.update(data["attendance_values"].keys())
        
        # Sort attendance types for consistent ordering
        for att_type in sorted(attendance_types):
            datasets.append(Dataset(
                label=att_type.capitalize(),  # Capitalize for chart display
                data=[class_data[class_id]["attendance_values"].get(att_type, 0) for class_id in labels],
                backgroundColor=colors.get(att_type, "rgba(201, 203, 207, 1)")
            ))
        
        graph_data = GraphData(
            labels=[class_data[class_id]["class_name"] for class_id in labels],  # Use actual class names
            datasets=datasets,
            title=f"Attendance Summary for {today}",
            options={
                "scales": {
                    "y": {
                        "beginAtZero": True,
                        "ticks": {
                            "stepSize": 1
                        }
                    }
                }
            }
        )
        
        return AttendanceGraphData(summary=summary, graph=graph_data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching attendance summary: {str(e)}"
        )

@dashboard_router.get("/student-summary", response_model=StudentGraphData)
def get_student_summary(
    date: date = Query(default=None),
    session: Session = Depends(get_session)
):
    try:
        selected_date = date if date else datetime.utcnow().date()
        
        # Get total students using ID range
        first_id = session.exec(select(func.min(Students.student_id))).first() or 0
        last_id = session.exec(select(func.max(Students.student_id))).first() or 0
        total_students = (last_id - first_id + 1) if first_id and last_id else 0
        
        # Get marked and unmarked counts
        marked_count = session.exec(
            select(func.count(func.distinct(Attendance.student_id)))
            .where(Attendance.attendance_date == selected_date)
        ).first() or 0
        
        unmarked_count = total_students - marked_count

        # Rest of the attendance counting code...
        default_values = {
            "Present": 0, "Absent": 0, "Late": 0, "Leave": 0, "Unmarked": unmarked_count
        }
        
        # Update summary data safely
        summary_data = default_values.copy()
        attendance_counts = session.exec(
            select(
                AttendanceValue.attendance_value,
                func.count(Attendance.attendance_id).label("count")
            )
            .join(Attendance)
            .where(func.date(Attendance.attendance_date) == selected_date)
            .group_by(AttendanceValue.attendance_value)
        ).all()
        
        if attendance_counts:
            for value, count in attendance_counts:
                if value in summary_data:
                    summary_data[value] = count

        summary = StudentSummary(
            total_students=total_students,
            present=summary_data["Present"],
            absent=summary_data["Absent"],
            late=summary_data["Late"],
            leave=summary_data["Leave"]
        )
        
        # Create graph data without percentages
        graph_data = GraphData(
            labels=list(default_values.keys()),
            datasets=[Dataset(
                label=f"Student Attendance for {selected_date} (Total Students: {total_students})",
                data=[summary_data[status] for status in default_values.keys()],
                backgroundColor=[
                    "rgba(75, 192, 192, 0.8)",   # Present
                    "rgba(255, 99, 132, 0.8)",   # Absent
                    "rgba(255, 206, 86, 0.8)",   # Late

                    "rgba(255, 159, 64, 0.8)"    # Leave
                ],
                borderColor=[
                    "rgba(75, 192, 192, 1)",
                    "rgba(255, 99, 132, 1)",
                    "rgba(255, 206, 86, 1)",
                    "rgba(153, 102, 255, 1)",
                    "rgba(255, 159, 64, 1)"
                ],
                borderWidth=1
            )],
            title=f"Student Attendance Distribution for {selected_date}"
        )
        
        return StudentGraphData(summary=summary, graph=graph_data)
        
    except Exception as e:
        print(f"Error processing date {date}: {str(e)}")  # Debug log
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching student summary: {str(e)}"
        )

@dashboard_router.get("/income-summary", response_model=CategoryGraphData)
def get_income_summary(
    year: int = Query(default=datetime.now().year),
    month: int = Query(default=None),
    session: Session = Depends(get_session)
):
    """Fetch income summary by category for a selected month and year (default: current year)."""
    try:
        # Fetch all category names from IncomeCatNames
        from schemas.income_cat_names_model import IncomeCatNames
        all_cats = session.exec(select(IncomeCatNames)).all()
        cat_id_to_name = {cat.income_cat_name_id: cat.income_cat_name for cat in all_cats}
        categories = list(cat_id_to_name.values())

        # Build base query: group by category_id
        stmt = select(
            Income.category_id,
            func.sum(Income.amount).label("total_amount")
        ).where(func.extract("year", Income.date) == year)
        if month:
            stmt = stmt.where(func.extract("month", Income.date) == month)
        stmt = stmt.group_by(Income.category_id).order_by(Income.category_id)

        result = session.exec(stmt).all()

        # Prepare category summary with all categories (even if zero)
        category_summary = {cat_name: 0.0 for cat_name in categories}
        for row in result:
            cat_name = cat_id_to_name.get(row.category_id, f"Unknown-{row.category_id}")
            category_summary[cat_name] = float(row.total_amount or 0)
        amounts = [category_summary[cat] for cat in categories]

        # Graph data
        graph_data = GraphData(
            labels=categories,
            datasets=[Dataset(
                label=f"Income by Category ({year}{'-{:02d}'.format(month) if month else ''})",
                data=amounts,
                backgroundColor="rgba(0, 200, 83, 0.7)",  # Green
                borderColor="rgba(0, 200, 83, 1)",
                borderWidth=1
            )],
            title=f"Income Category Details for {year}{'-{:02d}'.format(month) if month else ''}",
            options={
                "scales": {
                    "y": {
                        "beginAtZero": True,
                        "title": {
                            "display": True,
                            "text": "Amount (Rs)"
                        }
                    }
                }
            }
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
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching income summary: {str(e)}"
        )

@dashboard_router.get("/expense-summary", response_model=CategoryGraphData)
def get_expense_summary(
    year: int = Query(default=datetime.now().year),
    month: int = Query(default=None),
    session: Session = Depends(get_session)
):
    """Fetch expense summary by category for a selected month and year (default: current year)."""
    try:
        # Fetch all category names from ExpenseCatNames
        from schemas.expense_cat_names_model import ExpenseCatNames
        all_cats = session.exec(select(ExpenseCatNames)).all()
        cat_id_to_name = {cat.expense_cat_name_id: cat.expense_cat_name for cat in all_cats}
        categories = list(cat_id_to_name.values())

        # Build base query: group by category_id
        stmt = select(
            Expense.category_id,
            func.sum(Expense.amount).label("total_amount")
        ).where(func.extract("year", Expense.date) == year)
        if month:
            stmt = stmt.where(func.extract("month", Expense.date) == month)
        stmt = stmt.group_by(Expense.category_id).order_by(Expense.category_id)

        result = session.exec(stmt).all()

        # Prepare category summary with all categories (even if zero)
        category_summary = {cat_name: 0.0 for cat_name in categories}
        for row in result:
            cat_name = cat_id_to_name.get(row.category_id, f"Unknown-{row.category_id}")
            category_summary[cat_name] = float(row.total_amount or 0)
        amounts = [category_summary[cat] for cat in categories]

        # Graph data
        graph_data = GraphData(
            labels=categories,
            datasets=[Dataset(
                label=f"Expense by Category ({year}{'-{:02d}'.format(month) if month else ''})",
                data=amounts,
                backgroundColor="rgba(244, 67, 54, 0.7)",  # Red
                borderColor="rgba(244, 67, 54, 1)",
                borderWidth=1
            )],
            title=f"Expense Category Details for {year}{'-{:02d}'.format(month) if month else ''}",
            options={
                "scales": {
                    "y": {
                        "beginAtZero": True,
                        "title": {
                            "display": True,
                            "text": "Amount (Rs)"
                        }
                    }
                }
            }
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
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching expense summary: {str(e)}"
        )

@dashboard_router.get("/total-students", response_model=int)
def get_total_students(session: Session = Depends(get_session)):
    """Get total number of students by ID range."""
    try:
        first_id = session.exec(select(func.min(Students.student_id))).first() or 0
        last_id = session.exec(select(func.max(Students.student_id))).first() or 0
        total = (last_id - first_id + 1) if first_id and last_id else 0
        return int(total)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching total students: {str(e)}"
        )

@dashboard_router.get("/unmarked-students", response_model=List[int])
def get_unmarked_students(
    date: date = Query(default=None),
    session: Session = Depends(get_session)
):
    """Get list of student IDs whose attendance is not marked for given date."""
    try:
        selected_date = date if date else datetime.utcnow().date()
        
        # Get all student IDs
        all_students = session.exec(
            select(Students.student_id)
            .order_by(Students.student_id)
        ).all()
        
        # Get students who have attendance marked for the date
        marked_students = session.exec(
            select(Attendance.student_id)
            .where(Attendance.attendance_date == selected_date)
            .distinct()
        ).all()
        
        # Convert to sets for efficient difference operation
        all_set = set(all_students)
        marked_set = set(marked_students)
        
        # Get unmarked students
        unmarked_students = sorted(list(all_set - marked_set))
        
        return unmarked_students
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error finding unmarked students: {str(e)}"
        )

@dashboard_router.get("/income-expense-summary")
def get_income_expense_summary(
    year: int = datetime.now().year, session: Session = Depends(get_session)):
    """Get combined income and expense summary for comparison."""
    try:
        # Get income by month
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
        
        # Get expenses by month
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
        
        # Initialize monthly summaries
        month_summary = {i: {"income": 0, "expense": 0, "profit": 0} for i in range(1, 13)}
        for row in income_result:
            month_summary[row.month]["income"] = row.total_amount
        for row in expense_result:
            month_summary[row.month]["expense"] = row.total_amount
        for month in month_summary:
            month_summary[month]["profit"] = month_summary[month]["income"] - month_summary[month]["expense"]

        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        # Color arrays for each dataset
        income_color = "rgba(0, 200, 83, 0.7)"  # Green
        expense_color = "rgba(244, 67, 54, 0.7)"  # Red
        profit_colors = []
        for i in range(1, 13):
            profit = month_summary[i]["profit"]
            if profit > 0:
                profit_colors.append("rgba(33, 150, 243, 0.7)")  # Blue for profit
            elif profit < 0:
                profit_colors.append("rgba(255, 152, 0, 0.7)")   # Orange for loss
            else:
                profit_colors.append("rgba(201, 203, 207, 0.7)") # Grey for zero

        response = {
            "year": year,
            "monthly_data": month_summary,
            "month_names": month_names,
            "totals": {
                "income": sum(m["income"] for m in month_summary.values()),
                "expense": sum(m["expense"] for m in month_summary.values()),
                "profit": sum(m["profit"] for m in month_summary.values())
            },
            "graph": GraphData(
                labels=month_names,
                datasets=[
                    Dataset(
                        label="Income",
                        data=[month_summary[i+1]["income"] for i in range(12)],
                        backgroundColor=income_color,
                        borderColor=income_color,
                        borderWidth=1
                    ),
                    Dataset(
                        label="Expense",
                        data=[month_summary[i+1]["expense"] for i in range(12)],
                        backgroundColor=expense_color,
                        borderColor=expense_color,
                        borderWidth=1
                    ),
                    Dataset(
                        label="Profit/Loss",
                        data=[month_summary[i+1]["profit"] for i in range(12)],
                        backgroundColor=profit_colors,
                        borderColor=profit_colors,
                        borderWidth=1
                    )
                ],
                title=f"Financial Summary for {year}",
                options={
                    "scales": {
                        "y": {
                            "beginAtZero": True,
                            "title": {
                                "display": True,
                                "text": "Amount (Rs)"
                            }
                        }
                    }
                }
            )
        }
        return response
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching financial summary: {str(e)}"
        )

@dashboard_router.get("/fee-summary")
def get_fee_summary(
    year: int = datetime.now().year, session: Session = Depends(get_session)):
    """Get monthly fee collection summary."""
    try:
        current_year = datetime.now().year
        if year < 2000 or year > current_year + 5:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid year: {year}. Year must be between 2000 and {current_year + 5}"
            )

        stmt = (
            select(
                func.extract('month', Fee.created_at).label('month'),
                func.coalesce(func.sum(Fee.fee_amount), 0).label("total_amount")  # Use fee_amount, not amount
            )
            .where(func.extract("year", Fee.created_at) == year)
            .group_by(func.extract('month', Fee.created_at))
            .order_by('month')
        )

        try:
            result = session.exec(stmt).all()
        except Exception as db_error:
            print(f"Database error fetching fee data: {str(db_error)}")
            raise HTTPException(
                status_code=500,
                detail=f"Database error: {str(db_error)}"
            )

        month_summary = {i: 0 for i in range(1, 13)}
        for row in result:
            if row.month is not None and 1 <= row.month <= 12:
                month_summary[row.month] = float(row.total_amount or 0)

        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        total = sum(month_summary.values())

        response = {
            "year": year,
            "monthly_data": month_summary,
            "total": total,
            "graph": GraphData(
                labels=month_names,
                datasets=[Dataset(
                    label=f"Monthly Fee Collection for {year}",
                    data=list(month_summary.values()),
                    backgroundColor="rgba(54, 162, 235, 0.5)",
                    borderColor="rgba(54, 162, 235, 1)",
                    borderWidth=1,
                    type="bar"
                )],
                title=f"Fee Collection Summary for {year}" + (" (No Data)" if total == 0 else ""),
                options={
                    "scales": {
                        "y": {
                            "beginAtZero": True,
                            "title": {
                                "display": True,
                                "text": "Amount (Rs)"
                            }
                        }
                    }
                }
            )
        }

        return response

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in fee summary: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching fee summary: {str(e)}"
        )

@dashboard_router.get("/graph-test", response_class=HTMLResponse)
async def get_graph_test(session: Session = Depends(get_session)):
    return """
    <!DOCTYPE html>
    <html>
        <head>
            <title>Dashboard Graphs</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                .chart-container {
                    margin: 20px 0;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }
                h2 {
                    text-align: center;
                    color: #333;
                }
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
                    <h2>Class-wise Attendance for Today</h2>
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
                                <option value="1">Jan</option>
                                <option value="2">Feb</option>
                                <option value="3">Mar</option>
                                <option value="4">Apr</option>
                                <option value="5">May</option>
                                <option value="6">Jun</option>
                                <option value="7">Jul</option>
                                <option value="8">Aug</option>
                                <option value="9">Sep</option>
                                <option value="10">Oct</option>
                                <option value="11">Nov</option>
                                <option value="12">Dec</option>
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
                                <option value="1">Jan</option>
                                <option value="2">Feb</option>
                                <option value="3">Mar</option>
                                <option value="4">Apr</option>
                                <option value="5">May</option>
                                <option value="6">Jun</option>
                                <option value="7">Jul</option>
                                <option value="8">Aug</option>
                                <option value="9">Sep</option>
                                <option value="10">Oct</option>
                                <option value="11">Nov</option>
                                <option value="12">Dec</option>
                            </select>
                        </label>
                        <button onclick="updateExpenseCategoryChart()">Update</button>
                    </div>
                    <canvas id="expenseCategoryChart"></canvas>
                </div>
            </div>
            <script>
                const charts = {
                    userRoles: null,
                    student: null,
                    attendance: null,
                    financial: null,
                    fee: null,
                    incomeCategory: null,
                    expenseCategory: null
                };

                function destroyChart(chartId) {
                    if (charts[chartId]) {
                        charts[chartId].destroy();
                        charts[chartId] = null;
                    }
                }

                async function updateStudentChart() {
                    const date = document.getElementById('attendanceDate').value;
                    if (!date) {
                        alert('Please select a date');
                        return;
                    }
                    try {
                        const totalRes = await fetch('/dashboard/total-students');
                        const totalStudents = await totalRes.json();
                        const url = `/dashboard/student-summary?date=${date}`;
                        const response = await fetch(url);
                        const data = await response.json();
                        destroyChart('student');
                        const ctx = document.getElementById('studentChart');
                        charts.student = new Chart(ctx, {
                            type: 'bar',
                            data: data.graph,
                            options: { 
                                responsive: true,
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: { stepSize: 1 }
                                    }
                                }
                            }
                        });
                    } catch (error) {
                        console.error('Error fetching data:', error);
                        alert('Error updating chart. Please try again.');
                    }
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
                            type: 'bar',
                            data: data.graph,
                            options: { 
                                responsive: true,
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        title: { display: true, text: 'Amount (Rs)' }
                                    }
                                }
                            }
                        });
                    } catch (error) {
                        console.error('Error fetching income category data:', error);
                    }
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
                            type: 'bar',
                            data: data.graph,
                            options: { 
                                responsive: true,
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        title: { display: true, text: 'Amount (Rs)' }
                                    }
                                }
                            }
                        });
                    } catch (error) {
                        console.error('Error fetching expense category data:', error);
                    }
                }

                async function fetchAndRenderGraphs() {
                    try {
                        // User roles chart
                        const rolesRes = await fetch('/dashboard/user-roles');
                        const rolesData = await rolesRes.json();
                        destroyChart('userRoles');
                        charts.userRoles = new Chart(document.getElementById('userRolesChart'), {
                            type: 'bar',
                            data: rolesData.graph,
                            options: { 
                                responsive: true,
                                scales: {
                                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                                }
                            }
                        });

                        // Initial student chart
                        await updateStudentChart();

                        // Class attendance chart
                        const attendanceRes = await fetch('/dashboard/attendance-summary');
                        const attendanceData = await attendanceRes.json();
                        destroyChart('attendance');
                        charts.attendance = new Chart(document.getElementById('attendanceChart'), {
                            type: 'bar',
                            data: attendanceData.graph,
                            options: { 
                                responsive: true,
                                scales: {
                                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                                }
                            }
                        });

                        // Financial summary chart
                        const year = new Date().getFullYear();
                        const financialRes = await fetch(`/dashboard/income-expense-summary?year=${year}`);
                        const financialData = await financialRes.json();
                        destroyChart('financial');
                        charts.financial = new Chart(document.getElementById('financialChart'), {
                            type: 'bar',
                            data: financialData.graph,
                            options: { 
                                responsive: true,
                                scales: {
                                    y: { beginAtZero: true, title: { display: true, text: 'Amount (Rs)' } }
                                }
                            }
                        });

                        // Fee collection chart
                        const feeRes = await fetch(`/dashboard/fee-summary?year=${year}`);
                        const feeData = await feeRes.json();
                        destroyChart('fee');
                        charts.fee = new Chart(document.getElementById('feeChart'), {
                            type: 'bar',
                            data: feeData.graph,
                            options: { 
                                responsive: true,
                                scales: {
                                    y: { beginAtZero: true, title: { display: true, text: 'Amount (Rs)' } }
                                }
                            }
                        });

                        // Income category chart (default current year, all months)
                        document.getElementById('incomeYear').value = year;
                        await updateIncomeCategoryChart();

                        // Expense category chart (default current year, all months)
                        document.getElementById('expenseYear').value = year;
                        await updateExpenseCategoryChart();

                    } catch (error) {
                        console.error('Error fetching data:', error);
                    }
                }

                document.getElementById('attendanceDate').valueAsDate = new Date();
                fetchAndRenderGraphs();
            </script>
        </body>
    </html>
    """
