#!/usr/bin/env python3
"""
Payroll System Database Migration Script
========================================

This script creates the new payroll system tables for the production-grade
salary ledger system. It includes:

1. teacher_salary - Base salary configuration
2. salary_ledger - Monthly salary records (heart of system)
3. salary_payment - Payment transaction records
4. allowance - Monthly allowances
5. deduction - Monthly deductions

Run this script after updating the models and before starting the application.
"""

import sys
import os
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlmodel import SQLModel, create_engine
from utils.logging import logger
import setting

def create_payroll_tables():
    """Create the new payroll system tables"""

    CONN_STRING: str = str(setting.DATABASE_URL)

    if not CONN_STRING or CONN_STRING == "None":
        logger.error("DATABASE_URL is not configured!")
        return False

    try:
        # Create engine
        connect_args = {"connect_timeout": 10}
        engine = create_engine(
            CONN_STRING,
            echo=True,
            connect_args=connect_args,
            pool_size=10,
            max_overflow=20,
            pool_recycle=300,
            pool_pre_ping=True
        )

        logger.info("Creating payroll system tables...")

        # Import the new models to register them with SQLModel
        from schemas.salary_model import (
            TeacherSalary, SalaryLedger, SalaryPayment,
            Allowance, Deduction
        )

        # Create only the new payroll tables
        tables_to_create = [
            TeacherSalary.__table__,
            SalaryLedger.__table__,
            SalaryPayment.__table__,
            Allowance.__table__,
            Deduction.__table__
        ]

        for table in tables_to_create:
            try:
                table.create(engine, checkfirst=True)
                logger.info(f"✓ Created table: {table.name}")
            except Exception as e:
                logger.error(f"✗ Failed to create table {table.name}: {str(e)}")
                return False

        logger.info("✓ All payroll system tables created successfully!")
        return True

    except Exception as e:
        logger.error(f"✗ Migration failed: {str(e)}")
        return False

def verify_tables():
    """Verify that all tables were created successfully"""
    from sqlmodel import Session, text

    CONN_STRING: str = str(setting.DATABASE_URL)
    engine = create_engine(CONN_STRING)

    try:
        with Session(engine) as session:
            # Check if tables exist
            tables_to_check = [
                'teacher_salary', 'salary_ledger', 'salary_payment',
                'allowance', 'deduction'
            ]

            logger.info("Verifying table creation...")
            for table_name in tables_to_check:
                try:
                    result = session.exec(text(f"SELECT 1 FROM {table_name} LIMIT 1"))
                    logger.info(f"✓ Table {table_name} exists and is accessible")
                except Exception as e:
                    logger.warning(f"⚠ Table {table_name} may not exist: {str(e)}")

        logger.info("✓ Table verification completed")
        return True

    except Exception as e:
        logger.error(f"✗ Table verification failed: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("Starting payroll system database migration...")

    # Create tables
    if create_payroll_tables():
        logger.info("✓ Migration completed successfully!")

        # Verify tables
        if verify_tables():
            logger.info("✓ All tables verified successfully!")
        else:
            logger.warning("⚠ Table verification had issues, but migration completed")

    else:
        logger.error("✗ Migration failed!")
        sys.exit(1)

    logger.info("Migration script completed.")