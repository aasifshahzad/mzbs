import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from user.user_crud import require_admin, validate_student_access
from user.user_models import User, UserCreate, UserRole


def test_student_role_is_available_and_enforces_own-records_only():
    student = User(username="student1", email="student1@example.com", password="secret", role=UserRole.STUDENT, id=42)

    assert validate_student_access(student, 42) is True

    with pytest.raises(HTTPException) as exc_info:
        validate_student_access(student, 99)

    assert exc_info.value.status_code == 403
    assert "own student records" in str(exc_info.value.detail)


def test_chief_principal_and_staff_have_student_data_access():
    chief = User(username="chief", email="chief@example.com", password="secret", role=UserRole.CHIEF_PRINCIPAL, id=7)
    staff = User(username="staff", email="staff@example.com", password="secret", role=UserRole.STAFF, id=8)

    assert validate_student_access(chief, 99) is True
    assert validate_student_access(staff, 99) is True


def test_require_admin_blocks_chief_principal_but_allows_admin():
    chief = User(username="chief2", email="chief2@example.com", password="secret", role=UserRole.CHIEF_PRINCIPAL, id=9)
    admin = User(username="admin2", email="admin2@example.com", password="secret", role=UserRole.ADMIN, id=10)

    checker = require_admin()

    with pytest.raises(HTTPException) as exc_info:
        checker(chief)

    assert exc_info.value.status_code == 403
    assert checker(admin) is admin


def test_user_create_rejects_legacy_user_role():
    with pytest.raises(ValidationError):
        UserCreate(username="legacy", email="legacy@example.com", password="secret", role="USER")
