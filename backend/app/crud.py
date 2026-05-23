from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from . import models, schemas, security


def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user_in: schemas.UserCreate, role: models.UserRole = models.UserRole.student):
    if get_user_by_username(db, user_in.username) or get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=400, detail="Username or email already registered")
    hashed_password = security.get_password_hash(user_in.password)
    user = models.User(
        name=user_in.name,
        username=user_in.username,
        email=user_in.email,
        phone=user_in.phone,
        hashed_password=hashed_password,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user or not security.verify_password(password, user.hashed_password):
        return None
    return user


def list_courses(db: Session):
    return db.query(models.Course).order_by(models.Course.id).all()


def get_course(db: Session, course_id: int):
    return db.query(models.Course).filter(models.Course.id == course_id).first()


def get_course_by_slug(db: Session, slug: str):
    return db.query(models.Course).filter(models.Course.slug == slug).first()


def create_course(db: Session, course_data: dict):
    course = models.Course(**course_data)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def get_access_request(db: Session, user_id: int, course_id: int):
    return db.query(models.CourseAccessRequest).filter(models.CourseAccessRequest.user_id == user_id, models.CourseAccessRequest.course_id == course_id).first()


def list_user_requests(db: Session, user_id: int):
    return db.query(models.CourseAccessRequest).filter(models.CourseAccessRequest.user_id == user_id).all()


def list_pending_requests(db: Session):
    return db.query(models.CourseAccessRequest).filter(models.CourseAccessRequest.status == models.CourseAccessStatus.pending).all()


def create_access_request(db: Session, user_id: int, course_id: int):
    existing = get_access_request(db, user_id, course_id)
    if existing:
        raise HTTPException(status_code=400, detail="You already requested access for this course")
    request = models.CourseAccessRequest(user_id=user_id, course_id=course_id)
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def update_request_status(db: Session, request_id: int, approve: bool):
    request = db.query(models.CourseAccessRequest).filter(models.CourseAccessRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    request.status = models.CourseAccessStatus.approved if approve else models.CourseAccessStatus.rejected
    db.commit()
    db.refresh(request)
    return request


    
