from asyncio.log import logger
from datetime import date
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError

from db import get_session
from schemas.exam_marks_model import (
    ExamMark,
    ExamMarkCreate,
    ExamMarkResponse,
    ExamMarkUpdate,
    ExamMarksBulkSubmitRequest,
    ExamMarksBulkSubmitResponse,
)
from schemas.class_names_model import ClassNames
from schemas.teacher_names_model import TeacherNames
from schemas.students_model import Students
from user.user_crud import require_admin_teacher_principal
from user.user_models import User

exam_marks_router = APIRouter(
    prefix="/exam_marks",
    tags=["Exam Marks"],
    responses={404: {"description": "Not found"}},
)


@exam_marks_router.get("/", response_model=dict)
async def root():
    return {"message": "MMS-General service is running", "status": "Exam Marks Router Page running :-)"}


@exam_marks_router.post("/submit/", response_model=ExamMarksBulkSubmitResponse)
def submit_exam_marks(
    user: Annotated[User, Depends(require_admin_teacher_principal())],
    payload: ExamMarksBulkSubmitRequest,
    session: Session = Depends(get_session),
):
    class_name = session.get(ClassNames, payload.class_name_id)
    if not class_name:
        raise HTTPException(status_code=404, detail="Class not found")

    teacher = session.get(TeacherNames, payload.teacher_name_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    if not payload.marks:
        raise HTTPException(status_code=400, detail="At least one student mark is required")

    created_count = 0
    updated_count = 0
    records: List[ExamMark] = []

    for entry in payload.marks:
        existing = session.exec(
            select(ExamMark).where(
                ExamMark.exam_date == payload.exam_date,
                ExamMark.class_name_id == payload.class_name_id,
                ExamMark.teacher_name_id == payload.teacher_name_id,
                ExamMark.subject_name == payload.subject_name,
                ExamMark.exam_type == payload.exam_type,
                ExamMark.student_id == entry.student_id,
            )
        ).first()

        if existing:
            existing.total_marks = payload.total_marks
            existing.obtained_marks = entry.obtained_marks
            session.add(existing)
            updated_count += 1
            records.append(existing)
        else:
            new_record = ExamMark(
                exam_date=payload.exam_date,
                class_name_id=payload.class_name_id,
                teacher_name_id=payload.teacher_name_id,
                subject_name=payload.subject_name,
                exam_type=payload.exam_type,
                total_marks=payload.total_marks,
                student_id=entry.student_id,
                obtained_marks=entry.obtained_marks,
            )
            session.add(new_record)
            created_count += 1
            records.append(new_record)

    try:
        session.commit()
        for record in records:
            session.refresh(record)
    except IntegrityError as exc:
        session.rollback()
        logger.error(f"Integrity error: {exc}")
        raise HTTPException(status_code=400, detail="Unable to save exam marks")
    except Exception as exc:
        session.rollback()
        logger.error(f"Unexpected error: {exc}")
        raise HTTPException(status_code=500, detail="Internal server error")

    return ExamMarksBulkSubmitResponse(
        message="Exam marks submitted successfully",
        created_count=created_count,
        updated_count=updated_count,
        records=[ExamMarkResponse.model_validate(record) for record in records],
    )


@exam_marks_router.get("/all/", response_model=List[ExamMarkResponse])
def read_exam_marks(
    current_user: Annotated[User, Depends(require_admin_teacher_principal())],
    session: Session = Depends(get_session),
):
    rows = session.exec(
        select(ExamMark).order_by(ExamMark.exam_date.desc(), ExamMark.created_at.desc())
    ).all()
    return [ExamMarkResponse.model_validate(row) for row in rows]


@exam_marks_router.get("/by_filters/", response_model=List[ExamMarkResponse])
def read_exam_marks_by_filters(
    current_user: Annotated[User, Depends(require_admin_teacher_principal())],
    session: Session = Depends(get_session),
    exam_date: Optional[date] = Query(None),
    class_name_id: Optional[int] = Query(None),
    teacher_name_id: Optional[int] = Query(None),
    subject_name: Optional[str] = Query(None),
    exam_type: Optional[str] = Query(None),
):
    query = select(ExamMark)

    if exam_date:
        query = query.where(ExamMark.exam_date == exam_date)
    if class_name_id:
        query = query.where(ExamMark.class_name_id == class_name_id)
    if teacher_name_id:
        query = query.where(ExamMark.teacher_name_id == teacher_name_id)
    if subject_name:
        query = query.where(ExamMark.subject_name == subject_name)
    if exam_type:
        query = query.where(ExamMark.exam_type == exam_type)

    rows = session.exec(query.order_by(ExamMark.exam_date.desc(), ExamMark.created_at.desc())).all()
    return [ExamMarkResponse.model_validate(row) for row in rows]


@exam_marks_router.get("/{exam_mark_id}", response_model=ExamMarkResponse)
def read_exam_mark(
    current_user: Annotated[User, Depends(require_admin_teacher_principal())],
    exam_mark_id: int,
    session: Session = Depends(get_session),
):
    record = session.get(ExamMark, exam_mark_id)
    if not record:
        raise HTTPException(status_code=404, detail="Exam mark record not found")
    return ExamMarkResponse.model_validate(record)


@exam_marks_router.patch("/{exam_mark_id}", response_model=ExamMarkResponse)
def update_exam_mark(
    user: Annotated[User, Depends(require_admin_teacher_principal())],
    exam_mark_id: int,
    payload: ExamMarkUpdate,
    session: Session = Depends(get_session),
):
    record = session.get(ExamMark, exam_mark_id)
    if not record:
        raise HTTPException(status_code=404, detail="Exam mark record not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(record, key, value)

    try:
        session.add(record)
        session.commit()
        session.refresh(record)
    except Exception as exc:
        session.rollback()
        logger.error(f"Unexpected error: {exc}")
        raise HTTPException(status_code=500, detail="Unable to update exam mark")

    return ExamMarkResponse.model_validate(record)


@exam_marks_router.delete("/{exam_mark_id}", response_model=dict)
def delete_exam_mark(
    user: Annotated[User, Depends(require_admin_teacher_principal())],
    exam_mark_id: int,
    session: Session = Depends(get_session),
):
    record = session.get(ExamMark, exam_mark_id)
    if not record:
        raise HTTPException(status_code=404, detail="Exam mark record not found")

    session.delete(record)
    session.commit()
    return {"message": "Exam mark deleted successfully"}
