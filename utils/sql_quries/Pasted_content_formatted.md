Here are the SQL queries you can run directly in the Neon SQL Editor:

---

## 1. List All TablesHere are the SQL queries you can run directly in the Neon SQL Editor:

---

**1. List all tables**

```sql
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```
| table_name | table_type |
|---|---|
| 1 | admission | BASE TABLE |
| 2 | allowance | BASE TABLE |
| 3 | attendance | BASE TABLE |
| 4 | attendancetime | BASE TABLE |
| 5 | attendancevalue | BASE TABLE |
| 6 | classnames | BASE TABLE |
| 7 | deduction | BASE TABLE |
| 8 | deletedstudent | BASE TABLE |
| 9 | deletedstudents | BASE TABLE |
| 10 | expense | BASE TABLE |
| 11 | expensecatnames | BASE TABLE |
| 12 | fee | BASE TABLE |
| 13 | income | BASE TABLE |
| 14 | incomecatnames | BASE TABLE |
| 15 | playing_with_neon | BASE TABLE |
| 16 | refreshtoken | BASE TABLE |
| 17 | salary_ledger | BASE TABLE |
| 18 | salary_payment | BASE TABLE |
| 19 | students | BASE TABLE |
| 20 | teacher_salary | BASE TABLE |
| 21 | teachernames | BASE TABLE |
| 22 | termination | BASE TABLE |
| 23 | user | BASE TABLE |


---

**2. All columns with data type, nullability, and defaults**

```sql
SELECT
    c.table_name,
    c.column_name,
    c.data_type,
    c.udt_name AS pg_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    c.ordinal_position
FROM information_schema.columns c
JOIN information_schema.tables t
    ON c.table_name = t.table_name
    AND c.table_schema = t.table_schema
WHERE c.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY c.table_name, c.ordinal_position;
```

> `udt_name` is useful because `data_type` shows `USER-DEFINED` for custom enums — `pg_type` will show you the actual enum name.

---
| table_name | column_name | data_type | pg_type | character_maximum_length | is_nullable | column_default | ordinal_position |
|---|---|---|---|---|---|---|---|
| 1 | admission | admission_id | integer | int4 |  | NO | nextval('admission_admission_id_seq'::regclass) | 1 |
| 2 | admission | admission_date | timestamp without time zone | timestamp |  | YES |  | 2 |
| 3 | admission | required_class | character varying | varchar |  | NO |  | 3 |
| 4 | admission | student_id | integer | int4 |  | YES |  | 4 |
| 5 | allowance | id | integer | int4 |  | NO | nextval('allowance_id_seq'::regclass) | 1 |
| 6 | allowance | teacher_id | integer | int4 |  | NO |  | 2 |
| 7 | allowance | month | integer | int4 |  | NO |  | 3 |
| 8 | allowance | year | integer | int4 |  | NO |  | 4 |
| 9 | allowance | amount | numeric | numeric |  | NO |  | 5 |
| 10 | allowance | reason | character varying | varchar | 255 | YES |  | 6 |
| 11 | allowance | created_at | timestamp without time zone | timestamp |  | NO |  | 7 |
| 12 | attendance | attendance_id | integer | int4 |  | NO | nextval('attendance_attendance_id_seq'::regclass) | 1 |
| 13 | attendance | created_at | timestamp without time zone | timestamp |  | NO |  | 2 |
| 14 | attendance | updated_at | timestamp without time zone | timestamp |  | NO |  | 3 |
| 15 | attendance | attendance_date | timestamp without time zone | timestamp |  | NO |  | 4 |
| 16 | attendance | attendance_time_id | integer | int4 |  | YES |  | 5 |
| 17 | attendance | class_name_id | integer | int4 |  | YES |  | 6 |
| 18 | attendance | teacher_name_id | integer | int4 |  | YES |  | 7 |
| 19 | attendance | student_id | integer | int4 |  | YES |  | 8 |
| 20 | attendance | attendance_value_id | integer | int4 |  | YES |  | 9 |
| 21 | attendancetime | attendance_time_id | integer | int4 |  | NO | nextval('attendancetime_attendance_time_id_seq'::regclass) | 1 |
| 22 | attendancetime | created_at | timestamp without time zone | timestamp |  | NO |  | 2 |
| 23 | attendancetime | attendance_time | character varying | varchar |  | NO |  | 3 |
| 24 | attendancevalue | attendance_value_id | integer | int4 |  | NO | nextval('attendancevalue_attendance_value_id_seq'::regclass) | 1 |
| 25 | attendancevalue | created_at | timestamp without time zone | timestamp |  | NO |  | 2 |
| 26 | attendancevalue | attendance_value | character varying | varchar |  | NO |  | 3 |
| 27 | classnames | class_name_id | integer | int4 |  | NO | nextval('classnames_class_name_id_seq'::regclass) | 1 |
| 28 | classnames | created_at | timestamp without time zone | timestamp |  | NO |  | 2 |
| 29 | classnames | class_name | character varying | varchar |  | NO |  | 3 |
| 30 | deduction | id | integer | int4 |  | NO | nextval('deduction_id_seq'::regclass) | 1 |
| 31 | deduction | teacher_id | integer | int4 |  | NO |  | 2 |
| 32 | deduction | month | integer | int4 |  | NO |  | 3 |
| 33 | deduction | year | integer | int4 |  | NO |  | 4 |
| 34 | deduction | amount | numeric | numeric |  | NO |  | 5 |
| 35 | deduction | type | character varying | varchar | 50 | NO |  | 6 |
| 36 | deduction | reason | character varying | varchar | 255 | YES |  | 7 |
| 37 | deduction | created_at | timestamp without time zone | timestamp |  | NO |  | 8 |
| 38 | deletedstudent | student_id | integer | int4 |  | NO | nextval('deletedstudent_student_id_seq'::regclass) | 1 |
| 39 | deletedstudent | original_student_id | integer | int4 |  | NO |  | 2 |
| 40 | deletedstudent | student_name | character varying | varchar |  | NO |  | 3 |
| 41 | deletedstudent | class_name | character varying | varchar |  | NO |  | 4 |
| 42 | deletedstudent | student_date_of_birth | timestamp without time zone | timestamp |  | YES |  | 5 |
| 43 | deletedstudent | student_gender | character varying | varchar |  | YES |  | 6 |
| 44 | deletedstudent | student_age | character varying | varchar |  | YES |  | 7 |
| 45 | deletedstudent | student_education | character varying | varchar |  | YES |  | 8 |
| 46 | deletedstudent | student_city | character varying | varchar |  | YES |  | 9 |
| 47 | deletedstudent | student_address | character varying | varchar |  | YES |  | 10 |
| 48 | deletedstudent | father_name | character varying | varchar |  | YES |  | 11 |
| 49 | deletedstudent | father_occupation | character varying | varchar |  | YES |  | 12 |
| 50 | deletedstudent | father_cnic | character varying | varchar |  | YES |  | 13 |
| 51 | deletedstudent | father_cast_name | character varying | varchar |  | YES |  | 14 |
| 52 | deletedstudent | father_contact | character varying | varchar |  | YES |  | 15 |
| 53 | deletedstudent | reason | character varying | varchar |  | NO |  | 16 |
| 54 | deletedstudent | deleted_by | integer | int4 |  | NO |  | 17 |
| 55 | deletedstudent | deleted_at | timestamp without time zone | timestamp |  | YES |  | 18 |
| 56 | deletedstudent | attendance_summary | jsonb | jsonb |  | YES |  | 19 |
| 57 | deletedstudent | fee_summary | jsonb | jsonb |  | YES |  | 20 |
| 58 | deletedstudents | deleted_student_id | integer | int4 |  | NO | nextval('deletedstudents_deleted_student_id_seq'::regclass) | 1 |
| 59 | deletedstudents | student_id | integer | int4 |  | NO |  | 2 |
| 60 | deletedstudents | student_name | character varying | varchar |  | NO |  | 3 |
| 61 | deletedstudents | student_date_of_birth | timestamp without time zone | timestamp |  | NO |  | 4 |
| 62 | deletedstudents | student_gender | character varying | varchar |  | NO |  | 5 |
| 63 | deletedstudents | student_age | character varying | varchar |  | NO |  | 6 |
| 64 | deletedstudents | student_education | character varying | varchar |  | NO |  | 7 |
| 65 | deletedstudents | student_class_name | character varying | varchar |  | NO |  | 8 |
| 66 | deletedstudents | student_city | character varying | varchar |  | NO |  | 9 |
| 67 | deletedstudents | student_address | character varying | varchar |  | NO |  | 10 |
| 68 | deletedstudents | father_name | character varying | varchar |  | NO |  | 11 |
| 69 | deletedstudents | father_occupation | character varying | varchar |  | NO |  | 12 |
| 70 | deletedstudents | father_cnic | character varying | varchar |  | NO |  | 13 |
| 71 | deletedstudents | father_cast_name | character varying | varchar |  | NO |  | 14 |
| 72 | deletedstudents | father_contact | character varying | varchar |  | NO |  | 15 |
| 73 | deletedstudents | deletion_date | timestamp without time zone | timestamp |  | NO |  | 16 |
| 74 | deletedstudents | termination_reason | character varying | varchar |  | NO |  | 17 |
| 75 | deletedstudents | attendance_count | integer | int4 |  | NO |  | 18 |
| 76 | deletedstudents | total_stay | integer | int4 |  | NO |  | 19 |
| 77 | expense | id | integer | int4 |  | NO | nextval('expense_id_seq'::regclass) | 1 |
| 78 | expense | recipt_number | integer | int4 |  | YES |  | 2 |
| 79 | expense | created_at | timestamp without time zone | timestamp |  | YES |  | 3 |
| 80 | expense | date | timestamp without time zone | timestamp |  | YES |  | 4 |
| 81 | expense | category_id | integer | int4 |  | NO |  | 5 |
| 82 | expense | to_whom | character varying | varchar |  | NO |  | 6 |
| 83 | expense | description | character varying | varchar |  | YES |  | 7 |
| 84 | expense | amount | double precision | float8 |  | NO |  | 8 |
| 85 | expensecatnames | expense_cat_name_id | integer | int4 |  | NO | nextval('expensecatnames_expense_cat_name_id_seq'::regclass) | 1 |
| 86 | expensecatnames | created_at | timestamp without time zone | timestamp |  | NO |  | 2 |
| 87 | expensecatnames | expense_cat_name | character varying | varchar |  | NO |  | 3 |
| 88 | fee | fee_id | integer | int4 |  | NO | nextval('fee_fee_id_seq'::regclass) | 1 |
| 89 | fee | created_at | timestamp without time zone | timestamp |  | NO |  | 2 |
| 90 | fee | student_id | integer | int4 |  | YES |  | 3 |
| 91 | fee | class_id | integer | int4 |  | NO |  | 4 |
| 92 | fee | fee_amount | double precision | float8 |  | NO |  | 5 |
| 93 | fee | fee_month | character varying | varchar |  | NO |  | 6 |
| 94 | fee | fee_year | character varying | varchar |  | NO |  | 7 |
| 95 | fee | fee_status | USER-DEFINED | feestatus |  | NO |  | 8 |
| 96 | fee | original_student_id | integer | int4 |  | YES |  | 9 |
| 97 | income | id | integer | int4 |  | NO | nextval('income_id_seq'::regclass) | 1 |
| 98 | income | created_at | timestamp without time zone | timestamp |  | YES |  | 2 |
| 99 | income | recipt_number | integer | int4 |  | YES |  | 3 |
| 100 | income | date | timestamp without time zone | timestamp |  |  |  |

**3. Primary keys**

```sql
SELECT
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema  = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema  = 'public'
ORDER BY tc.table_name, kcu.ordinal_position;
```
| table_name | column_name | constraint_name |
|---|---|---|
| 1 | admission | admission_id | admission_pkey |
| 2 | allowance | id | allowance_pkey |
| 3 | attendance | attendance_id | attendance_pkey |
| 4 | attendancetime | attendance_time_id | attendancetime_pkey |
| 5 | attendancevalue | attendance_value_id | attendancevalue_pkey |
| 6 | classnames | class_name_id | classnames_pkey |
| 7 | deduction | id | deduction_pkey |
| 8 | deletedstudent | student_id | deletedstudent_pkey |
| 9 | deletedstudents | deleted_student_id | deletedstudents_pkey |
| 10 | expense | id | expense_pkey |
| 11 | expensecatnames | expense_cat_name_id | expensecatnames_pkey |
| 12 | fee | fee_id | fee_pkey |
| 13 | income | id | income_pkey |
| 14 | incomecatnames | income_cat_name_id | incomecatnames_pkey |
| 15 | playing_with_neon | id | playing_with_neon_pkey |
| 16 | refreshtoken | id | refreshtoken_pkey |
| 17 | salary_ledger | id | salary_ledger_pkey |
| 18 | salary_payment | id | salary_payment_pkey |
| 19 | students | student_id | students_pkey |
| 20 | teacher_salary | id | teacher_salary_pkey |
| 21 | teachernames | teacher_name_id | teachernames_pkey |
| 22 | termination | termination_id | termination_pkey |
| 23 | user | id | user_pkey |

---

**4. Foreign keys with referenced table and column**

```sql
SELECT
    tc.table_name          AS fk_table,
    kcu.column_name        AS fk_column,
    ccu.table_name         AS referenced_table,
    ccu.column_name        AS referenced_column,
    tc.constraint_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema  = kcu.table_schema
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema  = rc.constraint_schema
JOIN information_schema.constraint_column_usage ccu
    ON rc.unique_constraint_name  = ccu.constraint_name
    AND rc.unique_constraint_schema = ccu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema  = 'public'
ORDER BY tc.table_name, kcu.column_name;
```
| fk_table | fk_column | referenced_table | referenced_column | constraint_name | update_rule | delete_rule |
|---|---|---|---|---|---|---|
| 1 | admission | student_id | students | student_id | admission_student_id_fkey | NO ACTION | NO ACTION |
| 2 | allowance | teacher_id | teachernames | teacher_name_id | allowance_teacher_id_fkey | NO ACTION | NO ACTION |
| 3 | attendance | attendance_time_id | attendancetime | attendance_time_id | attendance_attendance_time_id_fkey | NO ACTION | NO ACTION |
| 4 | attendance | attendance_value_id | attendancevalue | attendance_value_id | attendance_attendance_value_id_fkey | NO ACTION | NO ACTION |
| 5 | attendance | class_name_id | classnames | class_name_id | attendance_class_name_id_fkey | NO ACTION | NO ACTION |
| 6 | attendance | student_id | students | student_id | attendance_student_id_fkey | NO ACTION | NO ACTION |
| 7 | attendance | teacher_name_id | teachernames | teacher_name_id | attendance_teacher_name_id_fkey | NO ACTION | NO ACTION |
| 8 | deduction | teacher_id | teachernames | teacher_name_id | deduction_teacher_id_fkey | NO ACTION | NO ACTION |
| 9 | expense | category_id | expensecatnames | expense_cat_name_id | expense_category_id_fkey | NO ACTION | NO ACTION |
| 10 | fee | class_id | classnames | class_name_id | fee_class_id_fkey | NO ACTION | NO ACTION |
| 11 | fee | student_id | students | student_id | fee_student_id_fkey | NO ACTION | SET NULL |
| 12 | income | category_id | incomecatnames | income_cat_name_id | income_category_id_fkey | NO ACTION | NO ACTION |
| 13 | salary_ledger | teacher_id | teachernames | teacher_name_id | salary_ledger_teacher_id_fkey | NO ACTION | NO ACTION |
| 14 | salary_payment | ledger_id | salary_ledger | id | salary_payment_ledger_id_fkey | NO ACTION | NO ACTION |
| 15 | salary_payment | teacher_id | teachernames | teacher_name_id | salary_payment_teacher_id_fkey | NO ACTION | NO ACTION |
| 16 | teacher_salary | teacher_id | teachernames | teacher_name_id | teacher_salary_teacher_id_fkey | NO ACTION | NO ACTION |
| 17 | termination | admission_id | admission | admission_id | termination_admission_id_fkey | NO ACTION | NO ACTION |

---

**5. (Optional) Indexes**

```sql
SELECT
    t.relname  AS table_name,
    i.relname  AS index_name,
    ix.indisunique AS is_unique,
    ix.indisprimary AS is_primary,
    array_agg(a.attname ORDER BY a.attnum) AS indexed_columns
FROM pg_class t
JOIN pg_index ix   ON t.oid = ix.indrelid
JOIN pg_class i    ON ix.indexrelid = i.oid
JOIN pg_attribute a ON a.attrelid = t.oid
    AND a.attnum = ANY(ix.indkey)
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
    AND t.relkind = 'r'
GROUP BY t.relname, i.relname, ix.indisunique, ix.indisprimary
ORDER BY t.relname, i.relname;
```
| table_name | index_name | is_unique | is_primary | indexed_columns |
|---|---|---|---|---|
| 1 | admission | admission_pkey | t | t | {admission_id} |
| 2 | allowance | allowance_pkey | t | t | {id} |
| 3 | attendance | attendance_pkey | t | t | {attendance_id} |
| 4 | attendancetime | attendancetime_pkey | t | t | {attendance_time_id} |
| 5 | attendancetime | ix_attendancetime_attendance_time | t | f | {attendance_time} |
| 6 | attendancevalue | attendancevalue_pkey | t | t | {attendance_value_id} |
| 7 | attendancevalue | ix_attendancevalue_attendance_value | t | f | {attendance_value} |
| 8 | classnames | classnames_pkey | t | t | {class_name_id} |
| 9 | classnames | ix_classnames_class_name | t | f | {class_name} |
| 10 | deduction | deduction_pkey | t | t | {id} |
| 11 | deletedstudent | deletedstudent_pkey | t | t | {student_id} |
| 12 | deletedstudents | deletedstudents_pkey | t | t | {deleted_student_id} |
| 13 | expense | expense_pkey | t | t | {id} |
| 14 | expensecatnames | expensecatnames_pkey | t | t | {expense_cat_name_id} |
| 15 | fee | fee_pkey | t | t | {fee_id} |
| 16 | income | income_pkey | t | t | {id} |
| 17 | incomecatnames | incomecatnames_pkey | t | t | {income_cat_name_id} |
| 18 | incomecatnames | ix_incomecatnames_income_cat_name | t | f | {income_cat_name} |
| 19 | playing_with_neon | playing_with_neon_pkey | t | t | {id} |
| 20 | refreshtoken | ix_refreshtoken_token | t | f | {token} |
| 21 | refreshtoken | ix_refreshtoken_user_id | f | f | {user_id} |
| 22 | refreshtoken | refreshtoken_pkey | t | t | {id} |
| 23 | salary_ledger | salary_ledger_pkey | t | t | {id} |
| 24 | salary_ledger | uq_teacher_month_year | t | f | {teacher_id,month,year} |
| 25 | salary_payment | salary_payment_pkey | t | t | {id} |
| 26 | students | students_pkey | t | t | {student_id} |
| 27 | teacher_salary | teacher_salary_pkey | t | t | {id} |
| 28 | teachernames | ix_teachernames_teacher_name | t | f | {teacher_name} |
| 29 | teachernames | teachernames_pkey | t | t | {teacher_name_id} |
| 30 | termination | termination_pkey | t | t | {termination_id} |
| 31 | user | ix_user_email | t | f | {email} |
| 32 | user | user_pkey | t | t | {id} |
| 33 | user | user_username_key | t | f | {username} |

---

**6. (Optional) All constraints (CHECK, UNIQUE, FK, PK in one view)**

```sql
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema  = kcu.table_schema
LEFT JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
    AND tc.table_schema  = cc.constraint_schema
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
```
| table_name | constraint_name | constraint_type | column_name | check_clause |
|---|---|---|---|---|
| 1 | admission | 2200_24737_1_not_null | CHECK |  | admission_id IS NOT NULL |
| 2 | admission | 2200_24737_3_not_null | CHECK |  | required_class IS NOT NULL |
| 3 | admission | admission_student_id_fkey | FOREIGN KEY | student_id |  |
| 4 | admission | admission_pkey | PRIMARY KEY | admission_id |  |
| 5 | allowance | 2200_49179_1_not_null | CHECK |  | id IS NOT NULL |
| 6 | allowance | 2200_49179_2_not_null | CHECK |  | teacher_id IS NOT NULL |
| 7 | allowance | 2200_49179_3_not_null | CHECK |  | month IS NOT NULL |
| 8 | allowance | 2200_49179_4_not_null | CHECK |  | year IS NOT NULL |
| 9 | allowance | 2200_49179_5_not_null | CHECK |  | amount IS NOT NULL |
| 10 | allowance | 2200_49179_7_not_null | CHECK |  | created_at IS NOT NULL |
| 11 | allowance | allowance_teacher_id_fkey | FOREIGN KEY | teacher_id |  |
| 12 | allowance | allowance_pkey | PRIMARY KEY | id |  |
| 13 | attendance | 2200_24705_1_not_null | CHECK |  | attendance_id IS NOT NULL |
| 14 | attendance | 2200_24705_2_not_null | CHECK |  | created_at IS NOT NULL |
| 15 | attendance | 2200_24705_3_not_null | CHECK |  | updated_at IS NOT NULL |
| 16 | attendance | 2200_24705_4_not_null | CHECK |  | attendance_date IS NOT NULL |
| 17 | attendance | attendance_attendance_time_id_fkey | FOREIGN KEY | attendance_time_id |  |
| 18 | attendance | attendance_attendance_value_id_fkey | FOREIGN KEY | attendance_value_id |  |
| 19 | attendance | attendance_class_name_id_fkey | FOREIGN KEY | class_name_id |  |
| 20 | attendance | attendance_student_id_fkey | FOREIGN KEY | student_id |  |
| 21 | attendance | attendance_teacher_name_id_fkey | FOREIGN KEY | teacher_name_id |  |
| 22 | attendance | attendance_pkey | PRIMARY KEY | attendance_id |  |
| 23 | attendancetime | 2200_24629_1_not_null | CHECK |  | attendance_time_id IS NOT NULL |
| 24 | attendancetime | 2200_24629_2_not_null | CHECK |  | created_at IS NOT NULL |
| 25 | attendancetime | 2200_24629_3_not_null | CHECK |  | attendance_time IS NOT NULL |
| 26 | attendancetime | attendancetime_pkey | PRIMARY KEY | attendance_time_id |  |
| 27 | attendancevalue | 2200_24596_1_not_null | CHECK |  | attendance_value_id IS NOT NULL |
| 28 | attendancevalue | 2200_24596_2_not_null | CHECK |  | created_at IS NOT NULL |
| 29 | attendancevalue | 2200_24596_3_not_null | CHECK |  | attendance_value IS NOT NULL |
| 30 | attendancevalue | attendancevalue_pkey | PRIMARY KEY | attendance_value_id |  |
| 31 | classnames | 2200_24639_1_not_null | CHECK |  | class_name_id IS NOT NULL |
| 32 | classnames | 2200_24639_2_not_null | CHECK |  | created_at IS NOT NULL |
| 33 | classnames | 2200_24639_3_not_null | CHECK |  | class_name IS NOT NULL |
| 34 | classnames | classnames_pkey | PRIMARY KEY | class_name_id |  |
| 35 | deduction | 2200_49191_1_not_null | CHECK |  | id IS NOT NULL |
| 36 | deduction | 2200_49191_2_not_null | CHECK |  | teacher_id IS NOT NULL |
| 37 | deduction | 2200_49191_3_not_null | CHECK |  | month IS NOT NULL |
| 38 | deduction | 2200_49191_4_not_null | CHECK |  | year IS NOT NULL |
| 39 | deduction | 2200_49191_5_not_null | CHECK |  | amount IS NOT NULL |
| 40 | deduction | 2200_49191_6_not_null | CHECK |  | type IS NOT NULL |
| 41 | deduction | 2200_49191_8_not_null | CHECK |  | created_at IS NOT NULL |
| 42 | deduction | deduction_teacher_id_fkey | FOREIGN KEY | teacher_id |  |
| 43 | deduction | deduction_pkey | PRIMARY KEY | id |  |
| 44 | deletedstudent | 2200_24668_16_not_null | CHECK |  | reason IS NOT NULL |
| 45 | deletedstudent | 2200_24668_17_not_null | CHECK |  | deleted_by IS NOT NULL |
| 46 | deletedstudent | 2200_24668_1_not_null | CHECK |  | student_id IS NOT NULL |
| 47 | deletedstudent | 2200_24668_2_not_null | CHECK |  | original_student_id IS NOT NULL |
| 48 | deletedstudent | 2200_24668_3_not_null | CHECK |  | student_name IS NOT NULL |
| 49 | deletedstudent | 2200_24668_4_not_null | CHECK |  | class_name IS NOT NULL |
| 50 | deletedstudent | deletedstudent_pkey | PRIMARY KEY | student_id |  |
| 51 | deletedstudents | 2200_24677_10_not_null | CHECK |  | student_address IS NOT NULL |
| 52 | deletedstudents | 2200_24677_11_not_null | CHECK |  | father_name IS NOT NULL |
| 53 | deletedstudents | 2200_24677_12_not_null | CHECK |  | father_occupation IS NOT NULL |
| 54 | deletedstudents | 2200_24677_13_not_null | CHECK |  | father_cnic IS NOT NULL |
| 55 | deletedstudents | 2200_24677_14_not_null | CHECK |  | father_cast_name IS NOT NULL |
| 56 | deletedstudents | 2200_24677_15_not_null | CHECK |  | father_contact IS NOT NULL |
| 57 | deletedstudents | 2200_24677_16_not_null | CHECK |  | deletion_date IS NOT NULL |
| 58 | deletedstudents | 2200_24677_17_not_null | CHECK |  | termination_reason IS NOT NULL |
| 59 | deletedstudents | 2200_24677_18_not_null | CHECK |  | attendance_count IS NOT NULL |
| 60 | deletedstudents | 2200_24677_19_not_null | CHECK |  | total_stay IS NOT NULL |
| 61 | deletedstudents | 2200_24677_1_not_null | CHECK |  | deleted_student_id IS NOT NULL |
| 62 | deletedstudents | 2200_24677_2_not_null | CHECK |  | student_id IS NOT NULL |
| 63 | deletedstudents | 2200_24677_3_not_null | CHECK |  | student_name IS NOT NULL |
| 64 | deletedstudents | 2200_24677_4_not_null | CHECK |  | student_date_of_birth IS NOT NULL |
| 65 | deletedstudents | 2200_24677_5_not_null | CHECK |  | student_gender IS NOT NULL |
| 66 | deletedstudents | 2200_24677_6_not_null | CHECK |  | student_age IS NOT NULL |
| 67 | deletedstudents | 2200_24677_7_not_null | CHECK |  | student_education IS NOT NULL |
| 68 | deletedstudents | 2200_24677_8_not_null | CHECK |  | student_class_name IS NOT NULL |
| 69 | deletedstudents | 2200_24677_9_not_null | CHECK |  | student_city IS NOT NULL |
| 70 | deletedstudents | deletedstudents_pkey | PRIMARY KEY | deleted_student_id |  |
| 71 | expense | 2200_24784_1_not_null | CHECK |  | id IS NOT NULL |
| 72 | expense | 2200_24784_5_not_null | CHECK |  | category_id IS NOT NULL |
| 73 | expense | 2200_24784_6_not_null | CHECK |  | to_whom IS NOT NULL |
| 74 | expense | 2200_24784_8_not_null | CHECK |  | amount IS NOT NULL |
| 75 | expense | expense_category_id_fkey | FOREIGN KEY | category_id |  |
| 76 | expense | expense_pkey | PRIMARY KEY | id |  |
| 77 | expensecatnames | 2200_24696_1_not_null | CHECK |  | expense_cat_name_id IS NOT NULL |
| 78 | expensecatnames | 2200_24696_2_not_null | CHECK |  | created_at IS NOT NULL |
| 79 | expensecatnames | 2200_24696_3_not_null | CHECK |  | expense_cat_name IS NOT NULL |
| 80 | expensecatnames | expensecatnames_pkey | PRIMARY KEY | expense_cat_name_id |  |
| 81 | fee | 2200_24751_1_not_null | CHECK |  | fee_id IS NOT NULL |
| 82 | fee | 2200_24751_2_not_null | CHECK |  | created_at IS NOT NULL |
| 83 | fee | 2200_24751_4_not_null | CHECK |  | class_id IS NOT NULL |
| 84 | fee | 2200_24751_5_not_null | CHECK |  | fee_amount IS NOT NULL |
| 85 | fee | 2200_24751_6_not_null | CHECK |  | fee_month IS NOT NULL |
| 86 | fee | 2200_24751_7_not_null | CHECK |  | fee_year IS NOT NULL |
| 87 | fee | 2200_24751_8_not_null | CHECK |  | fee_status IS NOT NULL |
| 88 | fee | fee_class_id_fkey | FOREIGN KEY | class_id |  |
| 89 | fee | fee_student_id_fkey | FOREIGN KEY | student_id |  |
| 90 | fee | fee_pkey | PRIMARY KEY | fee_id |  |
| 91 | income | 2200_24770_1_not_null | CHECK |  | id IS NOT NULL |
| 92 | income | 2200_24770_5_not_null | CHECK |  | category_id IS NOT NULL |
| 93 | income | 2200_24770_6_not_null | CHECK |  | source IS NOT NULL |
| 94 | income | 2200_24770_9_not_null | CHECK |  | amount IS NOT NULL |
| 95 | income | income_category_id_fkey | FOREIGN KEY | category_id |  |
| 96 | income | income_pkey | PRIMARY KEY | id |  |
| 97 | incomecatnames | 2200_24686_1_not_null | CHECK |  | income_cat_name_id IS NOT NULL |
| 98 | incomecatnames | 2200_24686_2_not_null | CHECK |  | created_at IS NOT NULL |
| 99 | incomecatnames | 2200_24686_3_not_null | CHECK |  | income_cat_name IS NOT NULL |
| 100 | incomecatnames | incomecatnames_pkey | PRIMARY KEY | income_cat_name_id |  |

---

**7. (Bonus) Enum types — critical for SQLModel `sa_column=Column(Enum(...))`**

Since you're using SQLModel, you're likely mapping Python enums to Postgres `ENUM` types. This query lists all custom enum types and their values:

```sql
SELECT
    t.typname  AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;
```
| enum_name | enum_value | sort_order |
|---|---|---|
| 1 | feestatus | PAID | 1 |
| 2 | feestatus | UNPAID | 2 |
| 3 | userrole | ADMIN | 1 |
| 4 | userrole | TEACHER | 2 |
| 5 | userrole | USER | 3 |
| 6 | userrole | ACCOUNTANT | 4 |
| 7 | userrole | FEE_MANAGER | 5 |
| 8 | userrole | PRINCIPAL | 6 |

---

**Tip for cross-checking against SQLModel**

Once you have the results, the common drift patterns to look for are:

- Column exists in DB but not in model (or vice versa) — missed field or a stale `create_all()`
- `is_nullable = YES` in DB but `Optional[...]` not set in model (or the opposite)
- Column default in DB doesn't match `default=` or `server_default=` in the model
- Enum values in DB out of sync with Python enum members
- Missing indexes for foreign key columns (SQLModel doesn't auto-create FK indexes, only the constraint)