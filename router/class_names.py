from asyncio.log import logger
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError  # <-- Add this import

from db import get_session
from utils.cache import cache_get, cache_set, cache_invalidate
from schemas.class_names_model import ClassNames, ClassNamesCreate, ClassNamesResponse
from schemas.attendance_model import Attendance
from user.user_crud import require_admin, require_admin_teacher_principal, require_admin_teacher_principal_accountant, require_admin_accountant_fee_manager
from user.user_models import User

classnames_router = APIRouter(
    prefix="/class_name",
    tags=["Class Name"],
    responses={404: {"Description": "Not found"}}
)


@classnames_router.get("/", response_model=dict)
async def root():
    return {"message": "MMS-General service is running", "status": "Class Name Router Page running :-)"}

@classnames_router.post("/add_class_name/", response_model=ClassNamesResponse)
def create_classnames(user: Annotated[User, Depends(require_admin())],classnames: ClassNamesCreate, session: Session = Depends(get_session)):
    db_classnames = ClassNames(**classnames.model_dump())
    session.add(db_classnames)

    try:
        session.commit()
        session.refresh(db_classnames)
        cache_invalidate("class_names")
    except IntegrityError as e:
        session.rollback()
        logger.error(f"Integrity error: {e}")
        if "unique constraint" in str(e.orig).lower() or "duplicate key" in str(e.orig).lower():
            raise HTTPException(
                status_code=400, detail="Class name or ID must be unique."
            )
        raise HTTPException(
            status_code=400, detail="Database integrity error."
        )
    except Exception as e:
        session.rollback()
        # Log any other unexpected errors
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=500, detail="Internal server error."
        )

    return db_classnames

# # Returns all placed class names


@classnames_router.get("/class-names-all/", response_model=List[ClassNamesResponse])
def read_classnames(
    current_user: Annotated[User, Depends(require_admin_accountant_fee_manager())],
    session: Session = Depends(get_session)
):
    cached = cache_get("class_names")
    if cached is not None:
        return cached
    classnames = session.exec(select(ClassNames)).all()
    result = [ClassNamesResponse.model_validate(c) for c in classnames]
    cache_set("class_names", result)
    return result

# # Returns class name of any specific class-name-id


@classnames_router.get("/{class_name_id}", response_model=ClassNamesResponse)
def read_classname(current_user: Annotated[User, Depends(require_admin_teacher_principal_accountant())],class_name_id: int, session: Session = Depends(get_session)):
    classnames = session.get(ClassNames, class_name_id)
    if not classnames:
        raise HTTPException(
            status_code=404, detail="Class name not found")
    return classnames


@classnames_router.delete("/del/{class_name}", response_model=dict)
def delete_classnames(user: Annotated[User, Depends(require_admin())],class_name: str, session: Session = Depends(get_session)):
    classnames = session.exec(select(ClassNames).where(
        ClassNames.class_name == class_name)).first()
    # Check for related records (adjust model and field as needed)
    related_records = []  # <-- Replace with actual query if you have related records
    if not classnames:
        raise HTTPException(
            status_code=404, detail="Class Name not found")
    if related_records:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete: There are records using this class name."
        )
    session.delete(classnames)
    session.commit()
    cache_invalidate("class_names")
    return {"message": "Class Name deleted successfully"}

@classnames_router.delete("/{class_name_id}", response_model=dict)
def delete_classnames_by_id(
    user: Annotated[User, Depends(require_admin())],
    class_name_id: int, 
    session: Session = Depends(get_session)
):
    """Delete a class name by its ID"""
    classname = session.get(ClassNames, class_name_id)
    # Check for related records (adjust model and field as needed)
    related_records = []  # <-- Replace with actual query if you have related records
    if not classname:
        raise HTTPException(
            status_code=404, 
            detail=f"Class Name with ID {class_name_id} not found"
        )
    if related_records:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete: There are records using this class name."
        )
    try:
        session.delete(classname)
        session.commit()
        cache_invalidate("class_names")
        return {"message": f"Class Name with ID {class_name_id} deleted successfully"}
    except Exception as e:
        session.rollback()
        logger.error(f"Error deleting class name: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error deleting class name"
        )

def get_class_name(session: Session, class_id: int) -> Optional[str]:
    """Fetch class name by class_id."""
    class_name_obj = session.exec(select(ClassNames).where(ClassNames.class_name_id == class_id)).first()
    if class_name_obj:
        return class_name_obj.class_name
    return None