from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from sqlmodel import SQLModel

from schemas.students_model import StudentsResponse


class StudentProfileAttendanceEntry(SQLModel):
    attendance_id: int
    attendance_date: datetime
    attendance_time: Optional[str] = None
    attendance_value: Optional[str] = None


class StudentProfileExamEntry(SQLModel):
    exam_id: int
    exam_date: date
    subject_name: str
    exam_type: str
    total_marks: int
    obtained_marks: int


class StudentProfileFeeEntry(SQLModel):
    fee_id: int
    fee_month: str
    fee_year: str
    fee_amount: Decimal
    fee_status: str


class StudentProfileResponse(SQLModel):
    student: StudentsResponse
    attendance: List[StudentProfileAttendanceEntry] = []
    exams: List[StudentProfileExamEntry] = []
    fees: List[StudentProfileFeeEntry] = []


class StudentProfileRequest(SQLModel):
    student_id: int
    class_name: Optional[str] = None
