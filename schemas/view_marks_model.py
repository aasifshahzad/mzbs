from datetime import date
from typing import List, Optional
from sqlmodel import SQLModel


class StudentMarkByDate(SQLModel):
    exam_date: date
    obtained_marks: Optional[int] = None
    total_marks: Optional[int] = None


class StudentMarksViewRow(SQLModel):
    student_id: int
    student_name: str
    marks: List[StudentMarkByDate]
    total_obtained_marks: int = 0
    total_marks: int = 0
    position: int = 0


def enrich_student_mark_rows(rows: List[StudentMarksViewRow]) -> List[StudentMarksViewRow]:
    enriched_rows: List[StudentMarksViewRow] = []
    for row in rows:
        total_obtained_marks = sum(item.obtained_marks or 0 for item in row.marks)
        total_marks = sum(item.total_marks or 0 for item in row.marks)
        enriched_rows.append(
            row.model_copy(update={"total_obtained_marks": total_obtained_marks, "total_marks": total_marks})
        )

    ranked_rows = sorted(
        enriched_rows,
        key=lambda item: (-item.total_obtained_marks, item.student_name.lower(), item.student_id),
    )

    previous_total: Optional[int] = None
    previous_position = 0
    for index, row in enumerate(ranked_rows):
        if previous_total is None or row.total_obtained_marks != previous_total:
            previous_position = index + 1
        previous_total = row.total_obtained_marks
        ranked_rows[index] = row.model_copy(update={"position": previous_position})

    return ranked_rows


class ViewMarksResponse(SQLModel):
    class_name_id: int
    subject_name: str
    exam_type: str
    dates: List[date]
    students: List[StudentMarksViewRow]
