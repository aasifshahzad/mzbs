import pytest
from sqlmodel import SQLModel, Session
from fastapi.testclient import TestClient
from .config import engine, init_test_db
from main import app
from db import get_session

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Setup test database"""
    init_test_db()
    yield
    SQLModel.metadata.drop_all(engine)

@pytest.fixture
def test_session():
    """Provide test database session"""
    with Session(engine) as session:
        try:
            yield session
        finally:
            session.rollback()
            session.close()

@pytest.fixture
def test_client(test_session):
    """Provide test client with database session"""
    def override_get_session():
        try:
            yield test_session
        finally:
            test_session.rollback()
    
    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()

@pytest.fixture(autouse=True)
def setup_db():
    """Setup and teardown the database for each test."""
    from sqlmodel import SQLModel
    from user.user_models import UserRole, User
    from sqlmodel import Session

    SQLModel.metadata.create_all(engine)  # Create tables

    # Seed the database with test users
    with Session(engine) as session:
        admin_user = User(
            username="admin",
            email="admin@example.com",
            hashed_password="adminpass123",  # Ensure this matches your hashing logic
            role=UserRole.ADMIN
        )
        teacher_user = User(
            username="teacher1",
            email="teacher1@example.com",
            hashed_password="teacherpass123",  # Ensure this matches your hashing logic
            role=UserRole.TEACHER
        )
        regular_user = User(
            username="user1",
            email="user1@example.com",
            hashed_password="userpass123",  # Ensure this matches your hashing logic
            role=UserRole.STUDENT
        )
        session.add_all([admin_user, teacher_user, regular_user])
        session.commit()

    yield
    SQLModel.metadata.drop_all(engine)  # Drop tables after the test

@pytest.fixture
def admin_token(test_client):
    """Get admin token."""
    response = test_client.post("/auth/login", data={
        "username": "admin",
        "password": "adminpass123"
    })
    assert response.status_code == 200, f"Login failed: {response.json()}"
    return response.json()["access_token"]

@pytest.fixture
def teacher_token(test_client):
    """Get teacher token."""
    response = test_client.post("/auth/login", data={
        "username": "teacher1",
        "password": "teacherpass123"
    })
    assert response.status_code == 200, f"Login failed: {response.json()}"
    return response.json()["access_token"]