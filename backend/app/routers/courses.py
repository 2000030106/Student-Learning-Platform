from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas, crud, auth
from ..deps import get_db

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("/", response_model=list[schemas.CourseResponse])
def read_courses(db: Session = Depends(get_db)):
    return crud.list_courses(db)


@router.get("/{course_slug}", response_model=schemas.CourseResponse)
def read_course(course_slug: str, db: Session = Depends(get_db)):
    course = crud.get_course_by_slug(db, course_slug)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.post("/{course_slug}/request", response_model=schemas.CourseAccessRequestResponse)
def request_course_access(
    course_slug: str,
    current_user: schemas.UserResponse = Depends(auth.require_role(["student"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return crud.create_access_request(db, current_user.id, course.id)


@router.get("/requests/me", response_model=list[schemas.CourseAccessRequestResponse])
def my_access_requests(current_user: schemas.UserResponse = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    return crud.list_user_requests(db, current_user.id)


@router.get("/requests/pending", response_model=list[schemas.CourseAccessRequestResponse])
def pending_requests(current_user: schemas.UserResponse = Depends(auth.require_role(["trainer", "admin"])), db: Session = Depends(get_db)):
    return crud.list_pending_requests(db)


@router.post("/requests/approve", response_model=schemas.CourseAccessRequestResponse)
def approve_request(
    decision: schemas.ApproveRequest,
    current_user: schemas.UserResponse = Depends(auth.require_role(["admin"])),
    db: Session = Depends(get_db),
):
    return crud.update_request_status(db, decision.request_id, decision.approve)
