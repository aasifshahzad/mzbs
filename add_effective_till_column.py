"""
Migration script to add effective_till column to teacher_salary table
and backfill existing data.

Run this script once to update your database:
python add_effective_till_column.py
"""

from sqlmodel import Session, select, create_engine
from sqlalchemy import text
from datetime import timedelta
import setting

# Get database connection
CONN_STRING = str(setting.DATABASE_URL)
engine = create_engine(CONN_STRING)

def add_effective_till_column():
    """Add effective_till column and backfill existing data"""
    
    with Session(engine) as session:
        try:
            # Step 1: Add the column (if it doesn't exist)
            print("Adding effective_till column...")
            session.exec(text("""
                ALTER TABLE teacher_salary 
                ADD COLUMN IF NOT EXISTS effective_till DATE NULL
            """))
            session.commit()
            print("✓ Column added successfully")
            
            # Step 2: Backfill existing data
            print("\nBackfilling existing salary records...")
            
            # For each teacher, set effective_till on all records except the latest
            result = session.exec(text("""
                UPDATE teacher_salary ts
                SET effective_till = (
                    SELECT (ts2.effective_from::date - INTERVAL '1 day')::date
                    FROM teacher_salary ts2
                    WHERE ts2.teacher_id = ts.teacher_id
                      AND ts2.effective_from > ts.effective_from
                    ORDER BY ts2.effective_from ASC
                    LIMIT 1
                )
                WHERE EXISTS (
                    SELECT 1 FROM teacher_salary ts2
                    WHERE ts2.teacher_id = ts.teacher_id
                      AND ts2.effective_from > ts.effective_from
                )
            """))
            session.commit()
            
            # Count updated records
            count_result = session.exec(text("""
                SELECT COUNT(*) FROM teacher_salary WHERE effective_till IS NOT NULL
            """))
            closed_count = count_result.first()
            
            active_result = session.exec(text("""
                SELECT COUNT(*) FROM teacher_salary WHERE effective_till IS NULL
            """))
            active_count = active_result.first()
            
            print(f"✓ Backfill complete:")
            print(f"  - {closed_count} closed salary records")
            print(f"  - {active_count} active salary records")
            
            print("\n✅ Migration completed successfully!")
            print("You can now restart your application.")
            
        except Exception as e:
            session.rollback()
            print(f"\n❌ Error during migration: {str(e)}")
            print("\nIf the column already exists, you can ignore this error.")
            raise

if __name__ == "__main__":
    print("=" * 60)
    print("SALARY HISTORY MIGRATION")
    print("=" * 60)
    print("\nThis script will:")
    print("1. Add 'effective_till' column to teacher_salary table")
    print("2. Backfill existing records with correct dates")
    print("\nPress Ctrl+C to cancel, or Enter to continue...")
    input()
    
    add_effective_till_column()

# Made with Bob
