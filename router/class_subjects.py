from asyncio.log import logger
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError

from db import get_session
from schemas.class_subject_model import (
    ClassSubject,
    ClassSubjectCreate,
    ClassSubjectResponse,
    ClassSubjectSetRequest,
    ClassSubjectSetResponse,
)
from schemas.class_names_model import ClassNames
from user.user_crud import require_admin, require_non_student
from user.user_models import User

class_subjects_router = APIRouter(
    prefix="/class_subject",
    tags=["Class Subject"],
    responses={404: {"Description": "Not found"}},
)


@class_subjects_router.get("/", response_model=dict)
async def root():
    return {"message": "MMS-General service is running", "status": "Class Subject Router Page running :-)"}


@class_subjects_router.post("/set/", response_model=ClassSubjectSetResponse)
def set_class_subjects(
    user: Annotated[User, Depends(require_admin())],
    payload: ClassSubjectSetRequest,
    session: Session = Depends(get_session),
):
    class_name = session.get(ClassNames, payload.class_name_id)
    if not class_name:
        raise HTTPException(status_code=404, detail="Class name not found")

    session.exec(select(ClassSubject).where(ClassSubject.class_name_id == payload.class_name_id)).all()
    existing = session.exec(
        select(ClassSubject).where(ClassSubject.class_name_id == payload.class_name_id)
    ).all()
    for item in existing:
        session.delete(item)

    subjects = []
    for subject_name in payload.subjects:
        subject_name = subject_name.strip()
        if not subject_name:
            continue
        new_item = ClassSubject(class_name_id=payload.class_name_id, subject_name=subject_name)
        session.add(new_item)
        subjects.append(subject_name)

    try:
        session.commit()
    except IntegrityError as e:
        session.rollback()
        logger.error(f"Integrity error: {e}")
        raise HTTPException(status_code=400, detail="Unable to save subjects")
    except Exception as e:
        session.rollback()
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

    return ClassSubjectSetResponse(class_name_id=payload.class_name_id, subjects=subjects)


@class_subjects_router.get("/class-subjects-all/", response_model=List[ClassSubjectResponse])
def read_class_subjects(
    current_user: Annotated[User, Depends(require_non_student())],
    session: Session = Depends(get_session),
):
    rows = session.exec(select(ClassSubject)).all()
    result = []
    for row in rows:
        class_name = session.get(ClassNames, row.class_name_id)
        result.append(
            ClassSubjectResponse(
                id=row.id,
                created_at=row.created_at,
                class_name_id=row.class_name_id,
                subject_name=row.subject_name,
                class_name=class_name.class_name if class_name else None,
            )
        )
    return result


@class_subjects_router.post("/add/", response_model=ClassSubjectResponse)
def create_class_subject(
    user: Annotated[User, Depends(require_admin())],
    payload: ClassSubjectCreate,
    session: Session = Depends(get_session),
):
    class_name = session.get(ClassNames, payload.class_name_id)
    if not class_name:
        raise HTTPException(status_code=404, detail="Class name not found")

    item = ClassSubject(class_name_id=payload.class_name_id, subject_name=payload.subject_name.strip())
    session.add(item)
    try:
        session.commit()
        session.refresh(item)
    except IntegrityError as e:
        session.rollback()
        logger.error(f"Integrity error: {e}")
        raise HTTPException(status_code=400, detail="Subject already exists for this class")
    except Exception as e:
        session.rollback()
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

    return ClassSubjectResponse(
        id=item.id,
        created_at=item.created_at,
        class_name_id=item.class_name_id,
        subject_name=item.subject_name,
        class_name=class_name.class_name,
    )


@class_subjects_router.delete("/{class_subject_id}", response_model=dict)
def delete_class_subject(
    user: Annotated[User, Depends(require_admin())],
    class_subject_id: int,
    session: Session = Depends(get_session),
):
    item = session.get(ClassSubject, class_subject_id)
    if not item:
        raise HTTPException(status_code=404, detail="Class subject not found")
    session.delete(item)
    session.commit()
    return {"message": "Class subject deleted successfully"}
