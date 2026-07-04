import pytest
from fastapi.testclient import TestClient
from datetime import datetime
from sqlmodel import Session
from main import app
from db import get_session
from tests.config import override_get_session, engine
from user.user_models import UserRole

# Setup test client with session override
app.dependency_overrides[get_session] = override_get_session
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    """Setup and teardown the database for each test."""
    from sqlmodel import SQLModel
    SQLModel.metadata.create_all(engine)  # Create tables
    yield
    SQLModel.metadata.drop_all(engine)  # Drop tables after the test

# Fixtures
@pytest.fixture
def admin_token():
    """Get admin token."""
    response = client.post("/auth/login", data={
        "username": "admin",
        "password": "adminpass123"
    })
    return response.json()["access_token"]

@pytest.fixture
def teacher_token():
    """Get teacher token."""
    response = client.post("/auth/login", data={
        "username": "teacher1",
        "password": "teacherpass123"
    })
    return response.json()["access_token"]

# Test Authentication Routes
def test_user_signup():
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123",
        "role": "STUDENT"
    }
    response = client.post("/auth/signup", json=user_data)
    assert response.status_code == 200
    assert response.json()["username"] == user_data["username"]

# Test Student Routes
def test_create_student(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    student_data = {
        "student_name": "Test Student",
        "student_date_of_birth": "2010-01-01",
        "student_gender": "Male",
        "student_age": 13,
        "student_education": "Primary",
        "class_name": "5A",
        "student_city": "Test City",
        "student_address": "Test Address",
        "father_name": "Test Father",
        "father_occupation": "Test Job",
        "father_cnic": "12345-1234567-1",
        "father_contact": "1234567890"
    }
    response = client.post("/students/add/", json=student_data, headers=headers)
    assert response.status_code == 200
    assert response.json()["student_name"] == student_data["student_name"]

def test_get_all_students(teacher_token):
    headers = {"Authorization": f"Bearer {teacher_token}"}
    response = client.get("/students/all_students/", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# Test Attendance Routes
def test_mark_attendance(teacher_token):
    headers = {"Authorization": f"Bearer {teacher_token}"}
    attendance_data = {
        "attendance_date": datetime.now().date().isoformat(),
        "attendance_time_id": 1,
        "class_name_id": 1,
        "teacher_name_id": 1,
        "student_id": 1,
        "attendance_value_id": 1
    }
    response = client.post(
        "/mark_attendance/add_attendance/", 
        json=attendance_data,
        headers=headers
    )
    assert response.status_code == 200

def test_get_attendance(teacher_token):
    headers = {"Authorization": f"Bearer {teacher_token}"}
    response = client.get(
        "/mark_attendance/show_all_attendance",
        headers=headers
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_attendance_show_all_returns_paginated_payload(teacher_token):
    headers = {"Authorization": f"Bearer {teacher_token}"}
    response = client.get(
        "/mark_attendance/show_all_attendance?page=1&page_size=5",
        headers=headers
    )
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, dict)
    assert "data" in payload
    assert "total" in payload
    assert "page" in payload
    assert "page_size" in payload
    assert "total_pages" in payload

# Test Class Names Routes
def test_create_class(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    class_data = {"class_name": "Test Class"}
    response = client.post(
        "/class_name/add_class_name/", 
        json=class_data,
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["class_name"] == class_data["class_name"]

# Test Teacher Names Routes
def test_create_teacher(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    teacher_data = {"teacher_name": "Test Teacher"}
    response = client.post(
        "/teacher_name/add_teacher_name/", 
        json=teacher_data,
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["teacher_name"] == teacher_data["teacher_name"]


def test_set_class_subjects(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    class_response = client.post(
        "/class_name/add_class_name/",
        json={"class_name": "Class 10"},
        headers=headers,
    )
    assert class_response.status_code == 200
    class_id = class_response.json()["class_name_id"]

    set_response = client.post(
        "/class_subject/set/",
        json={"class_name_id": class_id, "subjects": ["Math", "Science"]},
        headers=headers,
    )
    assert set_response.status_code == 200
    assert set_response.json()["class_name_id"] == class_id
    assert set_response.json()["subjects"] == ["Math", "Science"]

    list_response = client.get("/class_subject/class-subjects-all/", headers=headers)
    assert list_response.status_code == 200
    payload = list_response.json()
    assert isinstance(payload, list)
    assert any(item["class_name_id"] == class_id and item["subject_name"] == "Math" for item in payload)

# Test Attendance Value Routes
def test_create_attendance_value(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    value_data = {"attendance_value": "Present"}
    response = client.post(
        "/attendance_value/add_attendance_value/", 
        json=value_data,
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["attendance_value"] == value_data["attendance_value"]


def test_teacher_salary_history_updates_effective_till(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    teacher_response = client.post(
        "/teacher_name/add_teacher_name/",
        json={"teacher_name": "Salary Timeline Teacher"},
        headers=headers,
    )
    assert teacher_response.status_code == 200
    teacher_id = teacher_response.json()["teacher_name_id"]

    first_salary_response = client.post(
        "/salary/teacher-salary/add",
        json={
            "teacher_id": teacher_id,
            "base_salary": 20000,
            "effective_from": "2026-04-01",
        },
        headers=headers,
    )
    assert first_salary_response.status_code == 201

    second_salary_response = client.post(
        "/salary/teacher-salary/add",
        json={
            "teacher_id": teacher_id,
            "base_salary": 23500,
            "effective_from": "2026-05-05",
        },
        headers=headers,
    )
    assert second_salary_response.status_code == 201
    second_salary_id = second_salary_response.json()["id"]

    update_response = client.put(
        f"/salary/teacher-salary/{second_salary_id}",
        json={
            "effective_from": "2026-06-05",
        },
        headers=headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["effective_till"] is None

    history_response = client.get("/salary/teacher-salary/all", headers=headers)
    assert history_response.status_code == 200

    salaries = [item for item in history_response.json() if item["teacher_id"] == teacher_id]
    assert len(salaries) == 2

    earlier_record = next(item for item in salaries if item["effective_from"] == "2026-04-01")
    later_record = next(item for item in salaries if item["effective_from"] == "2026-06-05")

    assert earlier_record["effective_till"] == "2026-06-04"
    assert later_record["effective_till"] is None

# Test Error Cases
def test_unauthorized_access():
    response = client.get("/students/all_students/")
    assert response.status_code == 401

def test_forbidden_access():
    # Login as regular user
    response = client.post("/auth/login", data={
        "username": "user1",
        "password": "userpass123"
    })
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to access admin-only route
    response = client.post(
        "/students/add/",
        json={"student_name": "Test"},
        headers=headers
    )
    assert response.status_code == 403


def test_fee_filter_returns_paginated_payload(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.post(
        "/fee/filter/?fee_year=2026&page=1&page_size=5",
        headers=headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, dict)
    assert "data" in payload
    assert "total" in payload
    assert "page" in payload
    assert "page_size" in payload
    assert "total_pages" in payload


def test_dashboard_summary_endpoint_returns_combined_payload(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get(
        "/dashboard/summary?year=2026",
        headers=headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, dict)
    assert "user_roles" in payload
    assert "student_summary" in payload
    assert "attendance_summary" in payload
    assert "income_expense_summary" in payload
    assert "fee_summary" in payload
    assert "income_summary" in payload
    assert "expense_summary" in payload


def test_expense_filter_returns_paginated_payload(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get(
        "/expenses/filter-by-category/0?page=1&page_size=5",
        headers=headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, dict)
    assert "data" in payload
    assert "total" in payload
    assert "page" in payload
    assert "page_size" in payload
    assert "total_pages" in payload