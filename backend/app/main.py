import os
import threading
import time
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .database import engine, Base, SessionLocal
from . import crud, email_utils, models
from .routers import auth, code, courses, support, llm
from .schemas import UserCreate

app = FastAPI(title="Student Learning Platform API")

configured_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()]
origins = ["http://localhost:4173", "http://localhost:3000", *configured_origins]
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
app.include_router(support.router)
app.include_router(llm.router)


def _run_notification_worker():
    while True:
        db = SessionLocal()
        try:
            now = datetime.utcnow()
            pending = (
                db.query(models.EmailNotification)
                .filter(models.EmailNotification.sent_at.is_(None), models.EmailNotification.target_at <= now)
                .all()
            )
            for notification in pending:
                user = notification.user
                body = None
                subject = None
                if notification.event_type == models.NotificationEventType.quiz_start:
                    subject = "Quiz starts in 1 hour"
                    body = f"Hello {user.name},\n\nYour quiz will start in one hour. Please prepare to attempt it on the Student Learning Platform."
                elif notification.event_type == models.NotificationEventType.quiz_end:
                    subject = "Quiz ends in 1 hour"
                    body = f"Hello {user.name},\n\nYour quiz will close in one hour. Submit your answers before the deadline."
                elif notification.event_type == models.NotificationEventType.assignment_due:
                    subject = "Assignment due in 1 hour"
                    body = f"Hello {user.name},\n\nYour assignment is due in one hour. Please upload your completed work before the deadline."
                elif notification.event_type == models.NotificationEventType.contest_start:
                    subject = "Coding contest starts in 1 hour"
                    body = f"Hello {user.name},\n\nYour coding contest will begin in one hour. Get ready to solve the problems."
                elif notification.event_type == models.NotificationEventType.contest_end:
                    subject = "Coding contest ends in 1 hour"
                    body = f"Hello {user.name},\n\nYour coding contest will end in one hour. Submit your solution before the finish time."
                else:
                    subject = f"Upcoming event reminder"
                    body = f"Hello {user.name},\n\nAn upcoming event is scheduled soon. Please check the Student Learning Platform."
                if subject and body:
                    _send = email_utils.send_email(user.email, subject, body)
                    if _send:
                        notification.sent_at = datetime.utcnow()
                        db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()
        time.sleep(60)


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
    worker = threading.Thread(target=_run_notification_worker, daemon=True)
    worker.start()


@app.get("/api/health")
def health_check():
    return {"message": "Student Learning Platform API is running"}


frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        requested_file = frontend_dist / full_path
        if full_path and requested_file.is_file():
            return FileResponse(requested_file)
        return FileResponse(frontend_dist / "index.html")
