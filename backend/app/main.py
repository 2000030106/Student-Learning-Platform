import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, Base
from . import crud, models
from .routers import auth, code, courses
from .schemas import UserCreate

app = FastAPI(title="Student Learning Platform API")

origins = ["http://localhost:4173", "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"]
    ,allow_headers=["*"]
)

app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(code.router)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = Session(bind=engine)
    try:
        if not crud.get_user_by_username(db, "admin"):
            admin_user = UserCreate(
                name="Admin User",
                username="admin",
                email="admin@example.com",
                phone="0000000000",
                password="admin123",
            )
            crud.create_user(db, admin_user, role=models.UserRole.admin)
        if not crud.get_course_by_slug(db, "java-full-stack"):
            courses = [
                {
                    "title": "Java Full Stack",
                    "slug": "java-full-stack",
                    "summary": "Learn Java, Spring Boot, Angular and modern backend tooling.",
                    "audience": "Beginner to intermediate learners who want Java full stack preparation.",
                },
                {
                    "title": "Python Full Stack",
                    "slug": "python-full-stack",
                    "summary": "Master Python, FastAPI, React, and deploy full stack applications.",
                    "audience": "Students building web apps using Python and JavaScript.",
                },
                {
                    "title": "SQL Foundation",
                    "slug": "sql",
                    "summary": "Understand database design, queries, joins, indexes and optimization.",
                    "audience": "Learners who want to manage data using SQL databases.",
                },
                {
                    "title": "DevOps Essentials",
                    "slug": "devops",
                    "summary": "Learn CI/CD, Docker, Kubernetes, and infrastructure automation.",
                    "audience": "Learners preparing for DevOps roles and cloud engineering.",
                },
                {
                    "title": "Digital Marketing",
                    "slug": "digital-marketing",
                    "summary": "Learn SEO, analytics, social media campaigns and marketing automation.",
                    "audience": "Students who want to launch marketing campaigns and build brands.",
                },
            ]
            for item in courses:
                crud.create_course(db, item)
    finally:
        db.close()


@app.get("/")
def read_root():
    return {"message": "Student Learning Platform API is running"}
