from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlmodel import SQLModel, create_engine, Session, select
from utils.logging import logger
import setting

import schemas.student_parent_credentials_model  # noqa: F401

CONN_STRING: str = str(setting.DATABASE_URL)

# Validate DATABASE_URL is configured
if not CONN_STRING or CONN_STRING == "None":
    logger.error("DATABASE_URL is not configured! Please set DATABASE_URL environment variable.")
    logger.error("Example: postgresql://user:password@localhost/dbname")
    raise ValueError("DATABASE_URL environment variable is required but not set")

def get_engine(CONN_STRING):
    # Configure connection pooling for PostgreSQL
    # Note: Neon pooler doesn't support statement_timeout in options
    connect_args = {
        "connect_timeout": 10,  # Connection timeout in seconds
    }
    
    engine = create_engine(
        CONN_STRING,
        echo=True,
        connect_args=connect_args,
        pool_size=10,  # Number of connections to keep in pool
        max_overflow=20,  # Additional connections beyond pool_size
        pool_recycle=300,  # Recycle connections after 5 minutes to avoid stale connections
        pool_pre_ping=True  # Test connections before using to ensure they're still valid
    )
    logger.info("Engine created successfully")
    return engine

engine = get_engine(CONN_STRING=CONN_STRING)

# Add SessionLocal
SessionLocal = Session

def seed_attendance_values():
    """Seed initial attendance values into the database"""
    try:
        session = SessionLocal(engine)
        from schemas.attendance_value_model import AttendanceValue
        
        # Check if values already exist
        existing_values = session.exec(select(AttendanceValue)).all()
        if existing_values:
            logger.info(f"Attendance values already exist: {len(existing_values)} values found")
            session.close()
            return
        
        # Define the 4 core attendance values
        attendance_values = [
            AttendanceValue(attendance_value="Present"),
            AttendanceValue(attendance_value="Absent"),
            AttendanceValue(attendance_value="Late"),
            AttendanceValue(attendance_value="Leave"),
        ]
        
        for value in attendance_values:
            session.add(value)
        
        session.commit()
        logger.info("Attendance values seeded successfully: Present, Absent, Late, Leave")
        session.close()
    except Exception as e:
        logger.error(f"Error seeding attendance values: {str(e)}")
        session.close()
        raise

def create_db_and_tables():
    # SQLModel.metadata.drop_all(engine)  # Drop existing tables
    SQLModel.metadata.create_all(engine)
    seed_attendance_values()  # Seed initial data

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Creating database connection")
    try:
        create_db_and_tables()
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Database initialization error: {str(e)}")
        raise
    yield
    logger.info("Closing database connection")

def get_session():
    session = None
    try:
        session = SessionLocal(engine)
        yield session
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        raise
    finally:
        if session:
            session.close()
