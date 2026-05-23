from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
import enum


class UserRole(str, enum.Enum):
    student = "student"
    trainer = "trainer"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    username = Column(String(80), nullable=False, unique=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    phone = Column(String(50), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.student)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    requests = relationship("CourseAccessRequest", back_populates="user")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(140), unique=True, nullable=False)
    slug = Column(String(140), unique=True, nullable=False)
    summary = Column(Text, nullable=False)
    audience = Column(String(120), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    requests = relationship("CourseAccessRequest", back_populates="course")


class CourseAccessStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class CourseAccessRequest(Base):
    __tablename__ = "course_access_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    status = Column(Enum(CourseAccessStatus), nullable=False, default=CourseAccessStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="requests")
    course = relationship("Course", back_populates="requests")
