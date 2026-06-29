# Database Indexes Creation Guide

This document contains SQL commands to check table structure and create necessary indexes for optimal query performance.

---

## STEP 1: Check all table names

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

---

## STEP 2: Check column names for target tables

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name IN (
    'students', 'attendance', 'fee', 
    'teacher_salary', 'salary_ledger',
    'expense', 'income'
)
ORDER BY table_name, ordinal_position;
```

---

## STEP 3: Create all indexes

### Students
```sql
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_name);
```

### Attendance
```sql
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance(class_name_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
```

### Fee
```sql
CREATE INDEX IF NOT EXISTS idx_fee_class_id ON fee(class_id);
CREATE INDEX IF NOT EXISTS idx_fee_student_id ON fee(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_status ON fee(fee_status);
```

### Teacher Salary
```sql
CREATE INDEX IF NOT EXISTS idx_teacher_salary_teacher_id ON teacher_salary(teacher_id);
```

### Expense
```sql
CREATE INDEX IF NOT EXISTS idx_expense_category_id ON expense(category_id);
CREATE INDEX IF NOT EXISTS idx_expense_date ON expense(date);
```

### Income
```sql
CREATE INDEX IF NOT EXISTS idx_income_category_id ON income(category_id);
CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
```

---

## STEP 4: Verify all indexes created

```sql
SELECT 
    t.tablename,
    i.indexname,
    i.indexdef
FROM pg_tables t
LEFT JOIN pg_indexes i 
    ON t.tablename = i.tablename 
    AND i.schemaname = 'public'
WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'students', 'attendance', 'fee', 
        'teacher_salary', 'salary_ledger',
        'expense', 'income'
    )
ORDER BY t.tablename, i.indexname;
```

---

## Summary

This document provides a complete workflow for:
1. ✅ Listing all tables in the public schema
2. ✅ Checking column structure for key tables
3. ✅ Creating indexes on frequently queried columns for performance optimization
4. ✅ Verifying all indexes were created successfully

**Note:** All indexes use `IF NOT EXISTS` clause to prevent errors if they already exist.
