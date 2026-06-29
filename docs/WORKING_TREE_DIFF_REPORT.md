# Working Tree Diff Report

Generated: 2026-06-28

## Summary

- Branch: `main`
- Staged changes: **none**
- Modified tracked files: **33**
- Untracked files/folders: **8**

## Modified tracked files with diff counts

| File | Insertions | Deletions |
| --- | ---: | ---: |
| frontend/package-lock.json | 27 | 0 |
| frontend/package.json | 1 | 0 |
| frontend/src/api/Attendance/AttendanceAPI.ts | 15 | 20 |
| frontend/src/api/Classname/ClassNameAPI.ts | 1 | 2 |
| frontend/src/api/Dashboard/dashboardAPI.ts | 14 | 16 |
| frontend/src/api/Expense/ExpenseAPI.ts | 0 | 6 |
| frontend/src/api/Fees/AddFeeAPI.tsx | 7 | 14 |
| frontend/src/api/Income/IncomeAPI.ts | 2 | 23 |
| frontend/src/api/Salary/SalaryAPI.ts | 6 | 32 |
| frontend/src/api/Student/StudentsAPI.tsx | 7 | 14 |
| frontend/src/api/Teacher/TeachetAPI.ts | 0 | 1 |
| frontend/src/api/axiosInterceptorInstance.ts | 1 | 1 |
| frontend/src/app/dashboard/expense/add_expense/page.tsx | 3 | 4 |
| frontend/src/app/dashboard/income/add_income/page.tsx | 3 | 4 |
| frontend/src/app/layout.tsx | 14 | 13 |
| frontend/src/components/Attendance/AttendanceStatusSummary.tsx | 6 | 2 |
| frontend/src/components/Attendance/MarkAttendance.tsx | 56 | 54 |
| frontend/src/components/Attendance/ViewAttendance.tsx | 49 | 45 |
| frontend/src/components/ClassName/ClassTable.tsx | 20 | 2 |
| frontend/src/components/Expense/viewExpense.tsx | 12 | 21 |
| frontend/src/components/Fees/AddFees.tsx | 43 | 32 |
| frontend/src/components/Fees/ViewFees.tsx | 81 | 26 |
| frontend/src/components/Income/ViewIncome.tsx | 9 | 16 |
| frontend/src/components/Salary/SalaryLogs.tsx | 1 | 1 |
| frontend/src/components/Salary/ViewSalary.tsx | 0 | 9 |
| frontend/src/components/Students/AddNewStudent.tsx | 30 | 14 |
| frontend/src/components/Students/CreateStudent.tsx | 9 | 10 |
| frontend/src/components/Students/StudentTable.tsx | 28 | 13 |
| frontend/src/components/dashboard/AccountantDashboard.tsx | 15 | 19 |
| frontend/src/components/dashboard/AdminDashboard.tsx | 22 | 14 |
| frontend/src/components/dashboard/PrincipalDashboard.tsx | 7 | 4 |
| main.py | 2 | 1 |
| router/adm_del.py | 1 | 1 |
| router/admin_create_user.py | 1 | 1 |
| router/attendance_time.py | 1 | 1 |
| router/attendance_value.py | 1 | 1 |
| router/class_names.py | 1 | 1 |
| router/dashboard.py | 0 | 2 |
| router/deleted_students.py | 18 | 4 |
| router/expense.py | 35 | 18 |
| router/expense_cat_names.py | 1 | 1 |
| router/fee.py | 21 | 22 |
| router/income.py | 63 | 82 |
| router/income_cat_names.py | 1 | 1 |
| router/mark_attendance.py | 29 | 12 |
| router/salary.py | 87 | 53 |
| router/students.py | 18 | 4 |
| router/teacher_names.py | 1 | 1 |
| utils/folder_structure.py | 72 | 53 |
| utils/help.txt | 26 | 0 |

## Untracked files and folders

- frontend/src/components/dashboard/ResponseHelpers.ts
- frontend/src/components/providers/QueryProvider.tsx
- frontend/src/utils/apiResponse.ts
- utils/sql_quries/Database.md
- utils/sql_quries/Pasted_content_formatted.md
- utils/sql_quries/quries.txt
- utils/sql_quries/tmp_schema_compare.py
- utils/sql_quries/tmp_schema_extract.py

## Notes

- The working tree contains broad frontend updates, including API endpoints, dashboard pages, and student/attendance components.
- Backend modifications are centered in router modules and application entrypoint `main.py`.
- There are several new helper/support files outside tracked changes in frontend helpers and SQL query utilities.
