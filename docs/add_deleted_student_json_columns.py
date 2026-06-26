"""
Migration script to add JSON snapshot columns to the deleted_student audit table.

Run this script once to update your database:
    python docs/add_deleted_student_json_columns.py
"""

import sys
from pathlib import Path
from sqlmodel import Session, create_engine
from sqlalchemy import text

# Ensure the repository root is on sys.path when the script is executed from docs/
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

import setting

CONN_STRING = str(setting.DATABASE_URL)
engine = create_engine(CONN_STRING)


def find_deleted_student_table(session):
    candidates = ["deleted_student", "deleted_students", "deletedstudent"]
    results = session.exec(text(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name = ANY(:candidates)
        """
    ), {"candidates": candidates}).all()

    names = [row[0] for row in results]
    if names:
        return names[0]
    return None


def add_json_columns():
    with Session(engine) as session:
        try:
            table_name = find_deleted_student_table(session)
            if not table_name:
                raise RuntimeError(
                    "Could not find deleted student audit table. Checked: deleted_student, deleted_students, deletedstudent"
                )

            print(f"Adding JSON snapshot columns to {table_name} table...")

            session.exec(text(f"""
                ALTER TABLE {table_name}
                ADD COLUMN IF NOT EXISTS attendance_records JSON NULL,
                ADD COLUMN IF NOT EXISTS admission_records JSON NULL,
                ADD COLUMN IF NOT EXISTS fee_records JSON NULL
                """
            ))
            session.commit()

            print(f"\n✓ Columns added successfully to {table_name}:")
            print("  - attendance_records")
            print("  - admission_records")
            print("  - fee_records")
            print("\n✅ Migration completed successfully!")

        except Exception as e:
            session.rollback()
            print(f"\n❌ Error during migration: {str(e)}")
            raise


if __name__ == "__main__":
    print("=" * 60)
    print("DELETED STUDENT SNAPSHOT MIGRATION")
    print("=" * 60)
    print("\nThis script will add the following JSON columns to the deleted_student audit table:")
    print("  - attendance_records")
    print("  - admission_records")
    print("  - fee_records")
    print("\nPress Enter to continue or Ctrl+C to cancel.")
    input()
    add_json_columns()
