from sqlmodel import Session

from schemas.students_model import Students
from schemas.student_parent_credentials_model import StudentParentCredential
from db import engine


def test_student_portal_login_creates_credentials_and_allows_password_change(test_client):
    with Session(engine) as session:
        student = Students(
            student_name="Ali Khan",
            student_date_of_birth="2008-01-01T00:00:00",
            student_gender="Male",
            student_age="15",
            student_education="8th",
            class_name="8A",
            student_city="Lahore",
            student_address="House 1",
            father_name="Khan",
            father_occupation="Teacher",
            father_cnic="12345",
            father_cast_name="XYZ",
            father_contact="03001234567",
        )
        session.add(student)
        session.commit()
        session.refresh(student)

    login_response = test_client.post(
        "/student-portal/login",
        json={
            "student_name": "Ali Khan",
            "father_contact": "03001234567",
            "password": "parent123",
        },
    )

    assert login_response.status_code == 200, login_response.text
    payload = login_response.json()
    assert payload["student"]["student_id"] > 0
    assert payload["access_token"]

    with Session(engine) as session:
        credential = session.get(StudentParentCredential, payload["student"]["student_id"])
        assert credential is not None

    change_response = test_client.post(
        "/student-portal/change-password",
        headers={"Authorization": f"Bearer {payload['access_token']}"},
        json={
            "current_password": "parent123",
            "new_password": "newparent456",
            "confirm_password": "newparent456",
        },
    )

    assert change_response.status_code == 200, change_response.text

    second_login = test_client.post(
        "/student-portal/login",
        json={
            "student_name": "Ali Khan",
            "father_contact": "03001234567",
            "password": "newparent456",
        },
    )

    assert second_login.status_code == 200, second_login.text
