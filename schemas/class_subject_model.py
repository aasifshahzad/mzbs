from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import UniqueConstraint


class ClassSubjectBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default=datetime.now(), nullable=False)


class ClassSubject(ClassSubjectBase, table=True):
    __tablename__ = "class_subjects"
    __table_args__ = (UniqueConstraint("class_name_id", "subject_name", name="uq_class_subject"),)

    class_name_id: int = Field(foreign_key="classnames.class_name_id", index=True, nullable=False)
    subject_name: str = Field(index=True, nullable=False)


class ClassSubjectCreate(SQLModel):
    class_name_id: int
    subject_name: str


class ClassSubjectSetRequest(SQLModel):
    class_name_id: int
    subjects: list[str]


class ClassSubjectResponse(ClassSubjectBase, SQLModel):
    class_name_id: int
    subject_name: str
    class_name: Optional[str] = None


class ClassSubjectSetResponse(SQLModel):
    class_name_id: int
    subjects: list[str]
