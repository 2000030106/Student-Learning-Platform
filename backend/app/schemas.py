from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


class UserBase(BaseModel):
    name: str
    username: str
    email: EmailStr
    phone: Optional[str]


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True


class LoginRequest(BaseModel):
    username: str
    password: str


class CourseBase(BaseModel):
    title: str
    slug: str
    summary: str
    audience: str


class CourseResponse(CourseBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True


class CourseAccessRequestBase(BaseModel):
    course_id: int


class CourseAccessRequestResponse(BaseModel):
    id: int
    course_id: int
    user_id: int
    status: str
    created_at: datetime

    class Config:
        orm_mode = True


class ApproveRequest(BaseModel):
    request_id: int
    approve: bool


class MessageResponse(BaseModel):
    detail: str
