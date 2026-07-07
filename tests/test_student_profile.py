import pytest
from fastapi.testclient import TestClient
from main import app
from db import get_session
from tests.config import override_get_session, engine
from sqlmodel import SQLModel

app.dependency_overrides[get_session] = override_get_session
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)


def test_student_profile_endpoint_returns_student_summary():
    login_response = client.post(
        "/auth/login",
        data={"username": "admin", "password": "adminpass123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    class_response = client.post(
        "/class_name/add_class_name/",
        json={"class_name": "Profile Class"},
        headers=headers,
    )
    assert class_response.status_code == 200

    student_response = client.post(
        "/students/add/",
        json={
            "student_name": "Profile Student",
            "student_date_of_birth": "2010-01-01",
            "student_gender": "Male",
            "class_name": "Profile Class",
            "student_city": "Test City",
            "father_name": "Test Father",
            "student_age": "15",
            "student_education": "Primary",
            "student_address": "Test Address",
            "father_occupation": "Farmer",
            "father_cnic": "12345-1234567-1",
            "father_cast_name": "Test Cast",
            "father_contact": "1234567890",
        },
        headers=headers,
    )
    assert student_response.status_code == 200
    student_id = student_response.json()["student_id"]

    profile_response = client.get(
        f"/student_profile/?student_id={student_id}",
        headers=headers,
    )

    assert profile_response.status_code == 200
    payload = profile_response.json()
    assert payload["student"]["student_name"] == "Profile Student"
    assert payload["attendance"] == []
    assert payload["exams"] == []
    assert payload["fees"] == []
