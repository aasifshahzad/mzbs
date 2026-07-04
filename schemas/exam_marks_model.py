from datetime import date, datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field
from sqlalchemy import UniqueConstraint


class ExamMarkBase(SQLModel):
    exam_date: date
    class_name_id: int
    teacher_name_id: int
    subject_name: str
    exam_type: str
    total_marks: int
    student_id: int
    obtained_marks: Optional[float] = None


class ExamMark(ExamMarkBase, table=True):
    __tablename__ = "exam_marks"
    __table_args__ = (
        UniqueConstraint(
            "exam_date",
            "class_name_id",
            "teacher_name_id",
            "subject_name",
            "exam_type",
            "student_id",
            name="uq_exam_mark_student",
        ),
    )

    exam_mark_id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class ExamMarkCreate(SQLModel):
    exam_date: date
    class_name_id: int
    teacher_name_id: int
    subject_name: str
    exam_type: str
    total_marks: int
    student_id: int
    obtained_marks: Optional[float] = None


class ExamMarkUpdate(SQLModel):
    exam_date: Optional[date] = None
    class_name_id: Optional[int] = None
    teacher_name_id: Optional[int] = None
    subject_name: Optional[str] = None
    exam_type: Optional[str] = None
    total_marks: Optional[int] = None
    student_id: Optional[int] = None
    obtained_marks: Optional[float] = None


class ExamMarkResponse(ExamMarkBase, SQLModel):
    exam_mark_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ExamMarkEntry(SQLModel):
    student_id: int
    obtained_marks: Optional[float] = None


class ExamSessionSummary(SQLModel):
    exam_date: date
    class_name_id: int
    teacher_name_id: int
    subject_name: str
    exam_type: str
    total_marks: int
    student_count: int
    teacher_name: Optional[str] = None


class ExamMarksBulkSubmitRequest(SQLModel):
    exam_date: date
    class_name_id: int
    teacher_name_id: int
    subject_name: str
    exam_type: str
    total_marks: int
    marks: List[ExamMarkEntry]


class ExamMarksBulkSubmitResponse(SQLModel):
    message: str
    created_count: int
    updated_count: int
    records: List[ExamMarkResponse]
