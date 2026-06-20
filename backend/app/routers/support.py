from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import auth as auth_module, crud, schemas
from ..deps import get_db
from ..models import UserRole

router = APIRouter(prefix="/support", tags=["support"])


@router.post("/messages", response_model=schemas.SupportMessageResponse)
def create_support_message(
    msg_create: schemas.SupportMessageCreate,
    current_user: schemas.UserResponse = Depends(auth_module.get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can create support messages")
    return crud.create_support_message(db, current_user.id, msg_create.course_id, msg_create.question)


@router.get("/messages/course/{course_id}", response_model=schemas.SupportMessageList)
def get_course_support_messages(
    course_id: int,
    current_user: schemas.UserResponse = Depends(auth_module.get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["trainer", "admin"]:
        raise HTTPException(status_code=403, detail="Only trainers can view all support messages")
    return crud.get_support_messages_for_course(db, course_id)


@router.get("/messages/my", response_model=list[schemas.SupportMessageResponse])
def get_my_support_messages(
    current_user: schemas.UserResponse = Depends(auth_module.get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can view their own support messages")
    return crud.get_support_messages_for_student(db, current_user.id)


@router.post("/messages/{message_id}/answer", response_model=schemas.SupportMessageResponse)
def answer_support_message(
    message_id: int,
    answer_in: schemas.SupportMessageAnswer,
    current_user: schemas.UserResponse = Depends(auth_module.get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["trainer", "admin"]:
        raise HTTPException(status_code=403, detail="Only trainers can answer support messages")
    return crud.answer_support_message(db, message_id, current_user.id, answer_in.answer)
