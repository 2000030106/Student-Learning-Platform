import json
import os
import subprocess
import sys
import tempfile
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from uuid import uuid4

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from . import email_templates, email_utils, models, schemas, security

RUN_TIMEOUT_SECONDS = 5


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


def update_user_profile(db: Session, user_id: int, profile_data: dict):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    existing_email = get_user_by_email(db, profile_data["email"])
    if existing_email and existing_email.id != user.id:
        raise HTTPException(status_code=400, detail="Email already registered")
    user.email = profile_data["email"]
    user.phone = profile_data.get("phone")
    db.commit()
    db.refresh(user)
    return user


def change_user_password(db: Session, user_id: int, current_password: str, new_password: str):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not security.verify_password(current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    user.hashed_password = security.get_password_hash(new_password)
    db.commit()
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


def get_course_by_title(db: Session, title: str):
    return db.query(models.Course).filter(models.Course.title == title).first()


def create_course(db: Session, course_data: dict):
    if get_course_by_slug(db, course_data["slug"]) or get_course_by_title(db, course_data["title"]):
        raise HTTPException(status_code=400, detail="Course title or slug already exists")
    course = models.Course(**course_data)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def update_course_by_slug(db: Session, slug: str, course_data: dict):
    course = get_course_by_slug(db, slug)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    existing_slug = get_course_by_slug(db, course_data["slug"])
    if existing_slug and existing_slug.id != course.id:
        raise HTTPException(status_code=400, detail="Course slug already exists")
    existing_title = get_course_by_title(db, course_data["title"])
    if existing_title and existing_title.id != course.id:
        raise HTTPException(status_code=400, detail="Course title already exists")
    for field, value in course_data.items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course


def delete_course_by_slug(db: Session, slug: str):
    course = get_course_by_slug(db, slug)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return course


def get_access_request(db: Session, user_id: int, course_id: int):
    return db.query(models.CourseAccessRequest).filter(models.CourseAccessRequest.user_id == user_id, models.CourseAccessRequest.course_id == course_id).first()


def list_user_requests(db: Session, user_id: int):
    return db.query(models.CourseAccessRequest).filter(models.CourseAccessRequest.user_id == user_id).all()


def list_pending_requests(db: Session):
    return db.query(models.CourseAccessRequest).filter(models.CourseAccessRequest.status == models.CourseAccessStatus.pending).all()


def list_all_requests(db: Session):
    return db.query(models.CourseAccessRequest).order_by(models.CourseAccessRequest.created_at.desc()).all()


def list_users(db: Session):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()


def _send_email_if_available(email: str, subject: str, body: str, is_html: bool = False):
    if email:
        email_utils.send_email(email, subject, body, is_html=is_html)


def _queue_event_reminder(db: Session, user: models.User, event_type: models.NotificationEventType, entity_type: str, entity_id: int, target_at: datetime):
    if not user or not user.email:
        return None
    if target_at <= datetime.utcnow():
        return None
    notification = models.EmailNotification(
        user_id=user.id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        target_at=target_at,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def _clear_event_reminders(db: Session, entity_type: str, entity_id: int, event_types: list[models.NotificationEventType] | None = None):
    query = db.query(models.EmailNotification).filter(models.EmailNotification.entity_type == entity_type, models.EmailNotification.entity_id == entity_id, models.EmailNotification.sent_at.is_(None))
    if event_types is not None:
        query = query.filter(models.EmailNotification.event_type.in_(event_types))
    query.delete(synchronize_session=False)
    db.commit()


def _handle_course_request_notification(db: Session, request: models.CourseAccessRequest):
    admins = db.query(models.User).filter(models.User.role == models.UserRole.admin).all()
    for admin in admins:
        _send_email_if_available(
            admin.email,
            f"New course access request for {request.course.title if request.course else request.course_id}",
            (
                f"Hello {admin.name},\n\n"
                f"Student {request.user.name if request.user else request.user_id} ({request.user.username if request.user else ''}) "
                f"has requested access to {request.course.title if request.course else 'the course'}.\n\n"
                "Open the admin dashboard to approve or reject this request."
            ),
        )


def _handle_request_status_notification(db: Session, request: models.CourseAccessRequest):
    student = request.user
    if not student or not student.email:
        return
    status_text = "approved" if request.status == models.CourseAccessStatus.approved else "rejected"
    _send_email_if_available(
        student.email,
        f"Your course access request has been {status_text}",
        (
            f"Hello {student.name},\n\n"
            f"Your request for access to {request.course.title if request.course else 'the course'} "
            f"has been {status_text}.\n\n"
            "Please sign in to the learning platform for details."
        ),
    )


def create_access_request(db: Session, user_id: int, course_id: int):
    existing = get_access_request(db, user_id, course_id)
    if existing:
        raise HTTPException(status_code=400, detail="You already requested access for this course")
    request = models.CourseAccessRequest(user_id=user_id, course_id=course_id)
    db.add(request)
    db.commit()
    db.refresh(request)
    _handle_course_request_notification(db, request)
    return request


def update_request_status(db: Session, request_id: int, approve: bool):
    request = db.query(models.CourseAccessRequest).filter(models.CourseAccessRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    request.status = models.CourseAccessStatus.approved if approve else models.CourseAccessStatus.rejected
    db.commit()
    db.refresh(request)
    _handle_request_status_notification(db, request)
    return request


def get_trainer_course_request(db: Session, trainer_id: int, course_id: int):
    return (
        db.query(models.TrainerCourseRequest)
        .filter(
            models.TrainerCourseRequest.trainer_id == trainer_id,
            models.TrainerCourseRequest.course_id == course_id,
        )
        .first()
    )


def list_trainer_requests(db: Session, trainer_id: int):
    return db.query(models.TrainerCourseRequest).filter(models.TrainerCourseRequest.trainer_id == trainer_id).all()


def list_pending_trainer_requests(db: Session):
    return (
        db.query(models.TrainerCourseRequest)
        .filter(models.TrainerCourseRequest.status == models.CourseAccessStatus.pending)
        .all()
    )


def create_trainer_course_request(db: Session, trainer_id: int, course_id: int):
    existing = get_trainer_course_request(db, trainer_id, course_id)
    if existing:
        if existing.status == models.CourseAccessStatus.rejected:
            existing.status = models.CourseAccessStatus.pending
            db.commit()
            db.refresh(existing)
            return existing
        raise HTTPException(status_code=400, detail="You already requested to teach this course")
    request = models.TrainerCourseRequest(trainer_id=trainer_id, course_id=course_id)
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def update_trainer_request_status(db: Session, request_id: int, approve: bool):
    request = db.query(models.TrainerCourseRequest).filter(models.TrainerCourseRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Trainer request not found")
    request.status = models.CourseAccessStatus.approved if approve else models.CourseAccessStatus.rejected
    db.commit()
    db.refresh(request)
    return request


def get_trainer_course_status(db: Session, trainer_id: int, course_id: int):
    request = get_trainer_course_request(db, trainer_id, course_id)
    return request.status.value if request else None


def can_trainer_manage_course(db: Session, trainer_id: int, course_id: int):
    return get_trainer_course_status(db, trainer_id, course_id) == models.CourseAccessStatus.approved.value


def get_course_access_status(db: Session, user_id: int, course_id: int):
    request = get_access_request(db, user_id, course_id)
    return request.status.value if request else None


def list_learning_items(db: Session, course_id: int):
    return (
        db.query(models.CourseLearningItem)
        .filter(models.CourseLearningItem.course_id == course_id)
        .order_by(models.CourseLearningItem.position, models.CourseLearningItem.id)
        .all()
    )


def create_learning_item(db: Session, course_id: int, item_data: dict):
    if "kind" in item_data:
        item_data["kind"] = models.LearningItemKind(item_data["kind"].value if hasattr(item_data["kind"], "value") else item_data["kind"])
    item = models.CourseLearningItem(course_id=course_id, **item_data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_learning_item(db: Session, item_id: int):
    return db.query(models.CourseLearningItem).filter(models.CourseLearningItem.id == item_id).first()


def update_learning_item(db: Session, item_id: int, item_data: dict):
    item = get_learning_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Learning item not found")
    if "kind" in item_data:
        item_data["kind"] = models.LearningItemKind(item_data["kind"].value if hasattr(item_data["kind"], "value") else item_data["kind"])
    for field, value in item_data.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


def delete_learning_item(db: Session, item_id: int):
    item = get_learning_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Learning item not found")
    db.delete(item)
    db.commit()
    return item


def ensure_default_learning_items(db: Session, course: models.Course):
    if list_learning_items(db, course.id):
        return
    defaults = [
        {
            "kind": models.LearningItemKind.overview,
            "title": f"About {course.title}",
            "body": course.summary,
            "position": 1,
        },
        {
            "kind": models.LearningItemKind.module,
            "title": "Variables and fundamentals",
            "body": "Trainer can replace this with topic notes, examples, assignments, and practice steps.",
            "position": 1,
        },
        {
            "kind": models.LearningItemKind.quiz,
            "title": "Module check quiz",
            "body": "Trainer can add quiz questions, options, and instructions here.",
            "position": 1,
        },
        {
            "kind": models.LearningItemKind.video,
            "title": "Variables video lesson",
            "body": "Trainer can attach a video link for this topic or module.",
            "resource_url": "https://www.youtube.com/",
            "position": 1,
        },
    ]
    for item in defaults:
        create_learning_item(db, course.id, item)


def _question_dicts(quiz: models.CourseQuiz):
    return json.loads(quiz.questions_json or "[]")


def _public_quiz_summary(db: Session, quiz: models.CourseQuiz, user_id: Optional[int] = None):
    last_attempt = None
    if user_id:
        last_attempt = (
            db.query(models.QuizAttempt)
            .filter(models.QuizAttempt.quiz_id == quiz.id, models.QuizAttempt.user_id == user_id)
            .order_by(models.QuizAttempt.completed_at.desc())
            .first()
        )
    return {
        "id": quiz.id,
        "course_id": quiz.course_id,
        "title": quiz.title,
        "description": quiz.description,
        "time_limit_minutes": quiz.time_limit_minutes,
        "passing_score": quiz.passing_score,
        "starts_at": quiz.starts_at,
        "ends_at": quiz.ends_at,
        "created_at": quiz.created_at,
        "attempted": bool(last_attempt),
        "last_score": last_attempt.score if last_attempt else None,
        "passed": last_attempt.passed if last_attempt else None,
    }


def list_quizzes(db: Session, course_id: int, user_id: Optional[int] = None):
    quizzes = db.query(models.CourseQuiz).filter(models.CourseQuiz.course_id == course_id).order_by(models.CourseQuiz.id).all()
    return [_public_quiz_summary(db, quiz, user_id) for quiz in quizzes]


def get_quiz(db: Session, quiz_id: int):
    return db.query(models.CourseQuiz).filter(models.CourseQuiz.id == quiz_id).first()


def create_quiz(db: Session, course_id: int, quiz_data: dict):
    quiz = models.CourseQuiz(
        course_id=course_id,
        title=quiz_data["title"],
        description=quiz_data["description"],
        time_limit_minutes=quiz_data["time_limit_minutes"],
        passing_score=quiz_data["passing_score"],
        starts_at=quiz_data.get("starts_at"),
        ends_at=quiz_data.get("ends_at"),
        questions_json=json.dumps(quiz_data["questions"]),
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    approved_requests = (
        db.query(models.CourseAccessRequest)
        .filter(
            models.CourseAccessRequest.course_id == course_id,
            models.CourseAccessRequest.status == models.CourseAccessStatus.approved,
        )
        .all()
    )
    schedule = []
    if quiz.starts_at:
        schedule.append(f"Start time: {quiz.starts_at}")
    if quiz.ends_at:
        schedule.append(f"End time: {quiz.ends_at}")
    schedule_text = "\n".join(schedule) if schedule else "Schedule: Open without a fixed window"
    for request in approved_requests:
        if request.user and request.user.email:
            email_utils.send_email(
                request.user.email,
                f"New quiz scheduled: {quiz.title}",
                (
                    f"Hello {request.user.name},\n\n"
                    f"A quiz has been added for {quiz.course.title if quiz.course else 'your course'}.\n\n"
                    f"Quiz: {quiz.title}\n"
                    f"Description: {quiz.description}\n"
                    f"Time limit: {quiz.time_limit_minutes} minutes\n"
                    f"Passing score: {quiz.passing_score}%\n"
                    f"{schedule_text}\n\n"
                    "Please log in to the Student Learning Platform to attempt it."
                ),
            )
            if quiz.starts_at:
                _queue_event_reminder(
                    db,
                    request.user,
                    models.NotificationEventType.quiz_start,
                    "quiz",
                    quiz.id,
                    quiz.starts_at - timedelta(hours=1),
                )
            if quiz.ends_at:
                _queue_event_reminder(
                    db,
                    request.user,
                    models.NotificationEventType.quiz_end,
                    "quiz",
                    quiz.id,
                    quiz.ends_at - timedelta(hours=1),
                )
    return quiz


def update_quiz_schedule(db: Session, quiz: models.CourseQuiz, schedule_data: dict):
    quiz.time_limit_minutes = schedule_data["time_limit_minutes"]
    quiz.starts_at = schedule_data.get("starts_at")
    quiz.ends_at = schedule_data.get("ends_at")
    db.commit()
    db.refresh(quiz)
    _clear_event_reminders(db, "quiz", quiz.id, [models.NotificationEventType.quiz_start, models.NotificationEventType.quiz_end])
    approved_requests = (
        db.query(models.CourseAccessRequest)
        .filter(
            models.CourseAccessRequest.course_id == quiz.course_id,
            models.CourseAccessRequest.status == models.CourseAccessStatus.approved,
        )
        .all()
    )
    for request in approved_requests:
        if request.user and request.user.email:
            email_utils.send_email(
                request.user.email,
                f"Quiz timing updated: {quiz.title}",
                (
                    f"Hello {request.user.name},\n\n"
                    f"The quiz timing has been updated for {quiz.course.title if quiz.course else 'your course'}.\n\n"
                    f"Quiz: {quiz.title}\n"
                    f"Time limit: {quiz.time_limit_minutes} minutes\n"
                    f"Start time: {quiz.starts_at or 'Open now'}\n"
                    f"End time: {quiz.ends_at or 'No fixed end time'}\n\n"
                    "Please check the Student Learning Platform before attempting it."
                ),
            )
            if quiz.starts_at:
                _queue_event_reminder(
                    db,
                    request.user,
                    models.NotificationEventType.quiz_start,
                    "quiz",
                    quiz.id,
                    quiz.starts_at - timedelta(hours=1),
                )
            if quiz.ends_at:
                _queue_event_reminder(
                    db,
                    request.user,
                    models.NotificationEventType.quiz_end,
                    "quiz",
                    quiz.id,
                    quiz.ends_at - timedelta(hours=1),
                )
    return quiz


def get_quiz_detail(db: Session, quiz: models.CourseQuiz, user_id: Optional[int] = None):
    summary = _public_quiz_summary(db, quiz, user_id)
    questions = []
    for question in _question_dicts(quiz):
        questions.append(
            {
                "id": question["id"],
                "prompt": question["prompt"],
                "type": question.get("type", "single"),
                "options": question.get("options", []),
            }
        )
    return {**summary, "questions": questions}


def submit_quiz_attempt(db: Session, quiz: models.CourseQuiz, user_id: int, answers: list[dict]):
    questions = _question_dicts(quiz)
    answer_map = {answer["question_id"]: sorted(answer.get("selected_option_ids", [])) for answer in answers}
    score = 0
    for question in questions:
        correct = sorted(question.get("correct_option_ids", []))
        selected = answer_map.get(question["id"], [])
        if selected == correct:
            score += 1
    total = len(questions)
    percent = round((score / total) * 100) if total else 0
    attempt = models.QuizAttempt(
        quiz_id=quiz.id,
        user_id=user_id,
        answers_json=json.dumps(answers),
        score=percent,
        total_questions=total,
        passed=percent >= quiz.passing_score,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    if attempt.user and attempt.user.email:
        review = get_quiz_review(db, quiz, attempt)
        ranking = get_quiz_results_with_ranking(db, quiz.id, user_id)
        correct_count = len([question for question in review["questions"] if question["is_correct"]])
        wrong_count = total - correct_count
        email_utils.send_email(
            attempt.user.email,
            f"Quiz submitted and evaluated: {quiz.title}",
            email_templates.get_quiz_results_email(
                attempt.user.name,
                quiz.title,
                quiz.course.title if quiz.course else "Course",
                attempt.score,
                total,
                correct_count,
                wrong_count,
                attempt.passed,
                ranking["rank"],
                ranking["total_students"],
                ranking["passed_count"],
                ranking["failed_count"],
                review["questions"],
            ),
            is_html=True,
        )
    return attempt


def get_latest_quiz_attempt(db: Session, quiz_id: int, user_id: int):
    return (
        db.query(models.QuizAttempt)
        .filter(models.QuizAttempt.quiz_id == quiz_id, models.QuizAttempt.user_id == user_id)
        .order_by(models.QuizAttempt.completed_at.desc())
        .first()
    )


def get_quiz_review(db: Session, quiz: models.CourseQuiz, attempt: models.QuizAttempt):
    answer_map = {
        answer["question_id"]: answer.get("selected_option_ids", [])
        for answer in json.loads(attempt.answers_json or "[]")
    }
    review_questions = []
    for question in _question_dicts(quiz):
        selected = answer_map.get(question["id"], [])
        correct = question.get("correct_option_ids", [])
        review_questions.append(
            {
                "id": question["id"],
                "prompt": question["prompt"],
                "type": question.get("type", "single"),
                "options": question.get("options", []),
                "selected_option_ids": selected,
                "correct_option_ids": correct,
                "explanation": question.get("explanation"),
                "is_correct": sorted(selected) == sorted(correct),
            }
        )
    return {"attempt": attempt, "questions": review_questions}


def get_quiz_analytics(db: Session, quiz: models.CourseQuiz):
    attempts = db.query(models.QuizAttempt).filter(models.QuizAttempt.quiz_id == quiz.id).all()
    attempted_user_ids = {attempt.user_id for attempt in attempts}
    approved_requests = (
        db.query(models.CourseAccessRequest)
        .filter(
            models.CourseAccessRequest.course_id == quiz.course_id,
            models.CourseAccessRequest.status == models.CourseAccessStatus.approved,
        )
        .all()
    )
    not_attempted = [request for request in approved_requests if request.user_id not in attempted_user_ids]
    passed = len([attempt for attempt in attempts if attempt.passed])
    failed = len(attempts) - passed
    attempted = len(attempts)
    return {
        "quiz_id": quiz.id,
        "title": quiz.title,
        "attempted": attempted,
        "passed": passed,
        "failed": failed,
        "pass_rate": round((passed / attempted) * 100) if attempted else 0,
        "attempts": attempts,
        "not_attempted": not_attempted,
    }


def _public_assignment_summary(db: Session, assignment: models.CourseAssignment, user_id: Optional[int] = None):
    submitted = False
    if user_id:
        submitted = (
            db.query(models.AssignmentSubmission)
            .filter(
                models.AssignmentSubmission.assignment_id == assignment.id,
                models.AssignmentSubmission.user_id == user_id,
            )
            .first()
            is not None
        )
    return {
        "id": assignment.id,
        "course_id": assignment.course_id,
        "title": assignment.title,
        "description": assignment.description,
        "questions": assignment.questions,
        "due_at": assignment.due_at,
        "created_at": assignment.created_at,
        "submitted": submitted,
    }


def list_assignments(db: Session, course_id: int, user_id: Optional[int] = None):
    assignments = (
        db.query(models.CourseAssignment)
        .filter(models.CourseAssignment.course_id == course_id)
        .order_by(models.CourseAssignment.created_at.desc())
        .all()
    )
    return [_public_assignment_summary(db, assignment, user_id) for assignment in assignments]


def get_assignment(db: Session, assignment_id: int):
    return db.query(models.CourseAssignment).filter(models.CourseAssignment.id == assignment_id).first()


def create_assignment(db: Session, course_id: int, assignment_data: dict):
    assignment = models.CourseAssignment(course_id=course_id, **assignment_data)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    approved_requests = (
        db.query(models.CourseAccessRequest)
        .filter(
            models.CourseAccessRequest.course_id == course_id,
            models.CourseAccessRequest.status == models.CourseAccessStatus.approved,
        )
        .all()
    )
    for request in approved_requests:
        if request.user and request.user.email:
            email_utils.send_email(
                request.user.email,
                f"New assignment: {assignment.title}",
                (
                    f"Hello {request.user.name},\n\n"
                    f"A new assignment has been added for {assignment.course.title if assignment.course else 'your course'}.\n\n"
                    f"Assignment: {assignment.title}\n"
                    f"Due: {assignment.due_at or 'No due date set'}\n\n"
                    "Open the course assignment tab to view questions and upload your completed file."
                ),
            )
            if assignment.due_at:
                _queue_event_reminder(
                    db,
                    request.user,
                    models.NotificationEventType.assignment_due,
                    "assignment",
                    assignment.id,
                    assignment.due_at - timedelta(hours=1),
                )
    return assignment


def update_assignment_schedule(db: Session, assignment: models.CourseAssignment, schedule_data: dict):
    assignment.due_at = schedule_data.get("due_at")
    db.commit()
    db.refresh(assignment)
    _clear_event_reminders(db, "assignment", assignment.id, [models.NotificationEventType.assignment_due])
    approved_requests = (
        db.query(models.CourseAccessRequest)
        .filter(
            models.CourseAccessRequest.course_id == assignment.course_id,
            models.CourseAccessRequest.status == models.CourseAccessStatus.approved,
        )
        .all()
    )
    for request in approved_requests:
        if request.user and request.user.email:
            email_utils.send_email(
                request.user.email,
                f"Updated assignment due date: {assignment.title}",
                (
                    f"Hello {request.user.name},\n\n"
                    f"The due date for the assignment '{assignment.title}' has been updated for {assignment.course.title if assignment.course else 'your course'}.\n\n"
                    f"Due: {assignment.due_at or 'No due date set'}\n\n"
                    "Please review the assignment and submit your work before the deadline."
                ),
            )
            if assignment.due_at:
                _queue_event_reminder(
                    db,
                    request.user,
                    models.NotificationEventType.assignment_due,
                    "assignment",
                    assignment.id,
                    assignment.due_at - timedelta(hours=1),
                )
    return assignment


def submit_assignment(db: Session, assignment: models.CourseAssignment, user: models.User, upload_file, note: str = ""):
    upload_root = Path(os.getenv("UPLOAD_DIR", "uploads")) / "assignments" / str(assignment.id)
    upload_root.mkdir(parents=True, exist_ok=True)
    safe_name = Path(upload_file.filename or "assignment-file").name
    stored_filename = f"{uuid4().hex}_{safe_name}"
    file_path = upload_root / stored_filename
    with file_path.open("wb") as target:
        shutil.copyfileobj(upload_file.file, target)
    submission = models.AssignmentSubmission(
        assignment_id=assignment.id,
        user_id=user.id,
        original_filename=safe_name,
        stored_filename=stored_filename,
        file_path=os.fspath(file_path),
        content_type=upload_file.content_type,
        note=note,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    if user.email:
        email_utils.send_email(
            user.email,
            f"Assignment submitted: {assignment.title}",
            email_templates.get_submission_email(
                user.name,
                assignment.title,
                assignment.course.title if assignment.course else "Course",
                "assignment",
            ),
            is_html=True,
        )

    recipients = [trainer.email for trainer in db.query(models.User).filter(models.User.role == models.UserRole.admin).all()]
    trainer_requests = (
        db.query(models.TrainerCourseRequest)
        .filter(
            models.TrainerCourseRequest.course_id == assignment.course_id,
            models.TrainerCourseRequest.status == models.CourseAccessStatus.approved,
        )
        .all()
    )
    recipients.extend(request.trainer.email for request in trainer_requests if request.trainer and request.trainer.email)
    for email in sorted(set(filter(Boolean, recipients))):
        email_utils.send_email_with_attachment(
            email,
            f"Assignment submitted: {assignment.title}",
            (
                f"Student: {user.name} ({user.username})\n"
                f"Email: {user.email}\n"
                f"Course: {assignment.course.title if assignment.course else assignment.course_id}\n"
                f"Assignment: {assignment.title}\n"
                f"Submitted at: {submission.submitted_at}\n"
                f"Note: {note or 'No note'}"
            ),
            os.fspath(file_path),
            safe_name,
        )
    return submission


def get_assignment_analytics(db: Session, assignment: models.CourseAssignment):
    submissions = (
        db.query(models.AssignmentSubmission)
        .filter(models.AssignmentSubmission.assignment_id == assignment.id)
        .order_by(models.AssignmentSubmission.submitted_at.desc())
        .all()
    )
    submitted_user_ids = {submission.user_id for submission in submissions}
    approved_requests = (
        db.query(models.CourseAccessRequest)
        .filter(
            models.CourseAccessRequest.course_id == assignment.course_id,
            models.CourseAccessRequest.status == models.CourseAccessStatus.approved,
        )
        .all()
    )
    return {
        "assignment_id": assignment.id,
        "title": assignment.title,
        "submissions": submissions,
        "not_submitted": [request for request in approved_requests if request.user_id not in submitted_user_ids],
    }


def list_coding_contests(db: Session, course_id: int):
    return (
        db.query(models.CodingContest)
        .filter(models.CodingContest.course_id == course_id)
        .order_by(models.CodingContest.created_at.desc())
        .all()
    )


def get_coding_contest(db: Session, contest_id: int):
    return db.query(models.CodingContest).filter(models.CodingContest.id == contest_id).first()


def create_coding_contest(db: Session, course_id: int, contest_data: dict):
    questions_data = contest_data.pop("questions", [])
    contest = models.CodingContest(course_id=course_id, **contest_data)
    db.add(contest)
    db.flush()
    for question_data in questions_data:
        test_cases = question_data.pop("test_cases", [])
        if int(question_data.get("marks") or 0) <= 0:
            raise HTTPException(status_code=400, detail="Question marks must be greater than zero")
        language = question_data.get("language")
        question_data["language"] = models.CodingLanguage(language.value if hasattr(language, "value") else language)
        question = models.CodingQuestion(
            contest_id=contest.id,
            test_cases_json=json.dumps(test_cases),
            **question_data,
        )
        db.add(question)
    db.commit()
    db.refresh(contest)
    approved_requests = (
        db.query(models.CourseAccessRequest)
        .filter(
            models.CourseAccessRequest.course_id == course_id,
            models.CourseAccessRequest.status == models.CourseAccessStatus.approved,
        )
        .all()
    )
    for request in approved_requests:
        if request.user and request.user.email:
            email_utils.send_email(
                request.user.email,
                f"New coding contest: {contest.title}",
                (
                    f"Hello {request.user.name},\n\n"
                    f"A new coding contest has been added for {contest.course.title if contest.course else 'your course'}.\n\n"
                    f"Contest: {contest.title}\n"
                    f"Starts: {contest.starts_at or 'Not scheduled'}\n"
                    f"Ends: {contest.ends_at or 'Not scheduled'}\n\n"
                    "Open the coding contest tab to review the challenges and submit your solutions."
                ),
            )
            if contest.starts_at:
                _queue_event_reminder(
                    db,
                    request.user,
                    models.NotificationEventType.contest_start,
                    "coding_contest",
                    contest.id,
                    contest.starts_at - timedelta(hours=1),
                )
            if contest.ends_at:
                _queue_event_reminder(
                    db,
                    request.user,
                    models.NotificationEventType.contest_end,
                    "coding_contest",
                    contest.id,
                    contest.ends_at - timedelta(hours=1),
                )
    return contest

def update_coding_contest_schedule(db: Session, contest: models.CodingContest, schedule_data: dict):
    contest.starts_at = schedule_data.get("starts_at")
    contest.ends_at = schedule_data.get("ends_at")
    db.commit()
    db.refresh(contest)
    _clear_event_reminders(db, "coding_contest", contest.id, [models.NotificationEventType.contest_start, models.NotificationEventType.contest_end])
    approved_requests = (
        db.query(models.CourseAccessRequest)
        .filter(
            models.CourseAccessRequest.course_id == contest.course_id,
            models.CourseAccessRequest.status == models.CourseAccessStatus.approved,
        )
        .all()
    )
    for request in approved_requests:
        if request.user and request.user.email:
            email_utils.send_email(
                request.user.email,
                f"Coding contest schedule updated: {contest.title}",
                (
                    f"Hello {request.user.name},\n\n"
                    f"The schedule for the coding contest '{contest.title}' has been updated for {contest.course.title if contest.course else 'your course'}.\n\n"
                    f"Starts: {contest.starts_at or 'Not scheduled'}\n"
                    f"Ends: {contest.ends_at or 'Not scheduled'}\n\n"
                    "Please review the contest details and submit your solutions on time."
                ),
            )
            if contest.starts_at:
                _queue_event_reminder(
                    db,
                    request.user,
                    models.NotificationEventType.contest_start,
                    "coding_contest",
                    contest.id,
                    contest.starts_at - timedelta(hours=1),
                )
            if contest.ends_at:
                _queue_event_reminder(
                    db,
                    request.user,
                    models.NotificationEventType.contest_end,
                    "coding_contest",
                    contest.id,
                    contest.ends_at - timedelta(hours=1),
                )
    return contest
    approved_requests = (
        db.query(models.CourseAccessRequest)
        .filter(
            models.CourseAccessRequest.course_id == course_id,
            models.CourseAccessRequest.status == models.CourseAccessStatus.approved,
        )
        .all()
    )
    for request in approved_requests:
        if request.user and request.user.email:
            email_utils.send_email(
                request.user.email,
                f"New coding contest: {contest.title}",
                (
                    f"Hello {request.user.name},\n\n"
                    f"A new coding contest has been added for {contest.course.title if contest.course else 'your course'}.\n\n"
                    f"Contest: {contest.title}\n"
                    f"Starts: {contest.starts_at or 'Not scheduled'}\n"
                    f"Ends: {contest.ends_at or 'Not scheduled'}\n\n"
                    "Open the coding contest tab to review the challenges and submit your solutions."
                ),
            )
            if contest.starts_at:
                _queue_event_reminder(
                    db,
                    request.user,
                    models.NotificationEventType.contest_start,
                    "coding_contest",
                    contest.id,
                    contest.starts_at - timedelta(hours=1),
                )
            if contest.ends_at:
                _queue_event_reminder(
                    db,
                    request.user,
                    models.NotificationEventType.contest_end,
                    "coding_contest",
                    contest.id,
                    contest.ends_at - timedelta(hours=1),
                )
    return contest


def delete_coding_contest(db: Session, contest_id: int):
    contest = get_coding_contest(db, contest_id)
    if not contest:
        raise HTTPException(status_code=404, detail="Coding contest not found")
    db.delete(contest)
    db.commit()
    return contest


def _run_coding_command(command: list[str], cwd: str, stdin: str = ""):
    try:
        completed = subprocess.run(
            command,
            input=stdin,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=RUN_TIMEOUT_SECONDS,
        )
        return {
            "stdout": completed.stdout,
            "stderr": completed.stderr,
            "exit_code": completed.returncode,
            "timed_out": False,
        }
    except subprocess.TimeoutExpired as exc:
        return {
            "stdout": exc.stdout or "",
            "stderr": (exc.stderr or "") + f"\nExecution timed out after {RUN_TIMEOUT_SECONDS} seconds.",
            "exit_code": 124,
            "timed_out": True,
        }
    except FileNotFoundError:
        return {
            "stdout": "",
            "stderr": f"Runner not found: {command[0]}",
            "exit_code": 127,
            "timed_out": False,
        }


def _run_code_for_test(language: str, code: str, stdin: str):
    with tempfile.TemporaryDirectory(prefix="contest-code-") as temp_dir:
        workdir = Path(temp_dir)
        if language == models.CodingLanguage.python.value:
            source = workdir / "main.py"
            source.write_text(code, encoding="utf-8")
            return _run_coding_command([sys.executable, str(source)], cwd=temp_dir, stdin=stdin)
        if language == models.CodingLanguage.java.value:
            source = workdir / "Main.java"
            source.write_text(code, encoding="utf-8")
            compile_result = _run_coding_command(["javac", str(source)], cwd=temp_dir)
            if compile_result["exit_code"] != 0:
                return compile_result
            return _run_coding_command(["java", "-cp", os.fspath(workdir), "Main"], cwd=temp_dir, stdin=stdin)
    return {"stdout": "", "stderr": "Unsupported language", "exit_code": 1, "timed_out": False}


def _evaluate_web_question(question: models.CodingQuestion, code: str):
    test_cases = question.test_cases
    if not test_cases:
        return 0, "", "No checklist tests configured."
    passed = 0
    output_lines = []
    for test in test_cases:
        check = (test.get("check") or test.get("expected_output") or "").strip()
        ok = bool(check and check in code)
        passed += 1 if ok else 0
        output_lines.append(f"{'PASS' if ok else 'FAIL'}: contains {check}")
    score = round((passed / len(test_cases)) * question.marks)
    return score, "\n".join(output_lines), ""


def submit_coding_answer(db: Session, contest: models.CodingContest, question_id: int, user_id: int, code: str):
    question = (
        db.query(models.CodingQuestion)
        .filter(models.CodingQuestion.id == question_id, models.CodingQuestion.contest_id == contest.id)
        .first()
    )
    if not question:
        raise HTTPException(status_code=404, detail="Coding question not found")

    language = question.language.value if hasattr(question.language, "value") else question.language
    if language == models.CodingLanguage.web.value:
        score, stdout, stderr = _evaluate_web_question(question, code)
    else:
        test_cases = question.test_cases or [{"input": question.stdin or "", "expected_output": ""}]
        passed = 0
        stdout_parts = []
        stderr_parts = []
        for index, test in enumerate(test_cases, start=1):
            result = _run_code_for_test(language, code, test.get("input", ""))
            actual = (result["stdout"] or "").strip()
            expected = (test.get("expected_output") or "").strip()
            ok = result["exit_code"] == 0 and (not expected or actual == expected)
            passed += 1 if ok else 0
            stdout_parts.append(f"Test {index}: {'PASS' if ok else 'FAIL'}\nOutput: {actual}")
            if result["stderr"]:
                stderr_parts.append(f"Test {index}: {result['stderr'].strip()}")
        score = round((passed / len(test_cases)) * question.marks) if test_cases else 0
        stdout = "\n\n".join(stdout_parts)
        stderr = "\n\n".join(stderr_parts)

    submission = models.CodingSubmission(
        contest_id=contest.id,
        question_id=question.id,
        user_id=user_id,
        code=code,
        stdout=stdout,
        stderr=stderr,
        score=score,
        passed=score >= question.marks,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    if submission.user and submission.user.email:
        email_utils.send_email(
            submission.user.email,
            f"Coding submission received: {contest.title}",
            email_templates.get_submission_email(
                submission.user.name,
                contest.title,
                contest.course.title if contest.course else "Course",
                "coding contest",
            ),
            is_html=True,
        )
        results = get_contest_results_with_ranking(db, contest.id, user_id)
        max_score = sum(item.marks for item in contest.questions)
        question_rows = []
        for contest_question in sorted(contest.questions, key=lambda item: item.position):
            best_submission = max(
                [item for item in results["submissions"] if item.question_id == contest_question.id],
                key=lambda item: item.score,
                default=None,
            )
            question_rows.append(
                {
                    "title": contest_question.title,
                    "score": best_submission.score if best_submission else 0,
                    "max_score": contest_question.marks,
                    "passed": bool(best_submission and best_submission.score >= contest_question.marks),
                }
            )
        attempted_question_ids = {item.question_id for item in results["submissions"]}
        if contest.questions and len(attempted_question_ids) >= len(contest.questions):
            passed_count = len([row for row in question_rows if row["passed"]])
            failed_count = len(question_rows) - passed_count
            email_utils.send_email(
                submission.user.email,
                f"Coding contest result: {contest.title}",
                email_templates.get_contest_results_email(
                    submission.user.name,
                    contest.title,
                    contest.course.title if contest.course else "Course",
                    results["total_score"],
                    max_score,
                    results["rank"],
                    results["total_students"],
                    passed_count,
                    failed_count,
                    question_rows,
                ),
                is_html=True,
            )
    return submission


def get_coding_contest_analytics(db: Session, contest: models.CodingContest):
    attempts = (
        db.query(models.CodingSubmission)
        .filter(models.CodingSubmission.contest_id == contest.id)
        .order_by(models.CodingSubmission.created_at.desc())
        .all()
    )
    passed = len([attempt for attempt in attempts if attempt.passed])
    failed = len(attempts) - passed
    average_score = round(sum(attempt.score for attempt in attempts) / len(attempts)) if attempts else 0
    return {
        "contest_id": contest.id,
        "title": contest.title,
        "submissions": len(attempts),
        "passed": passed,
        "failed": failed,
        "average_score": average_score,
        "attempts": attempts,
    }


# Profile and Authentication Functions
def update_profile_picture(db: Session, user_id: int, profile_pic_url: str):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.profile_pic_url = profile_pic_url
    db.commit()
    db.refresh(user)
    return user


def get_user_profile(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def update_email_phone(db: Session, user_id: int, email: str = None, phone: str = None):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if email and email != user.email:
        existing = get_user_by_email(db, email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = email
    
    if phone is not None:
        user.phone = phone
    
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user_id: int, current_password: str, new_password: str):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not security.verify_password(current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    if current_password == new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")
    
    user.hashed_password = security.get_password_hash(new_password)
    db.commit()
    return {"detail": "Password changed successfully"}


# OTP Functions
def create_otp_token(db: Session, user: models.User, delivery_method: str):
    import random
    import string
    
    otp_code = ''.join(random.choices(string.digits, k=6))
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    otp_token = models.OTPToken(
        user_id=user.id,
        otp_code=otp_code,
        delivery_method=delivery_method,
        expires_at=expires_at,
    )
    db.add(otp_token)
    db.commit()
    db.refresh(otp_token)
    
    if delivery_method == "email" and user.email:
        email_utils.send_email(
            user.email,
            "Your OTP for Student Learning Platform",
            f"Hello {user.name},\n\nYour OTP for login is: {otp_code}\n\nThis OTP will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.",
        )
    
    return otp_token


def verify_otp_token(db: Session, username: str, otp_code: str):
    user = get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    otp_token = (
        db.query(models.OTPToken)
        .filter(
            models.OTPToken.user_id == user.id,
            models.OTPToken.otp_code == otp_code,
            models.OTPToken.expires_at > datetime.utcnow(),
        )
        .order_by(models.OTPToken.created_at.desc())
        .first()
    )
    
    if not otp_token:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    otp_token.is_verified = True
    db.commit()
    return user


# Support Message Functions
def create_support_message(db: Session, user_id: int, course_id: int, question: str):
    support_msg = models.SupportMessage(
        course_id=course_id,
        student_id=user_id,
        question=question,
    )
    db.add(support_msg)
    db.commit()
    db.refresh(support_msg)
    
    email_utils.send_email(
        "support@learningplatform.com",
        f"New support question in course {support_msg.course.title}",
        f"Student: {support_msg.student.name}\nQuestion: {question}",
    )
    
    return support_msg


def get_support_messages_for_course(db: Session, course_id: int):
    messages = (
        db.query(models.SupportMessage)
        .filter(models.SupportMessage.course_id == course_id)
        .order_by(models.SupportMessage.created_at.desc())
        .all()
    )
    open_count = len([m for m in messages if not m.is_resolved])
    resolved_count = len([m for m in messages if m.is_resolved])
    return {
        "total": len(messages),
        "open": open_count,
        "resolved": resolved_count,
        "messages": messages,
    }


def answer_support_message(db: Session, message_id: int, trainer_id: int, answer: str):
    msg = db.query(models.SupportMessage).filter(models.SupportMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Support message not found")
    
    msg.answer = answer
    msg.trainer_id = trainer_id
    msg.is_resolved = True
    msg.answered_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)
    
    if msg.student and msg.student.email:
        email_utils.send_email(
            msg.student.email,
            f"Your support question has been answered",
            f"Hello {msg.student.name},\n\nYour question has been answered:\n\nQuestion: {msg.question}\n\nAnswer: {answer}",
        )
    
    return msg


def get_support_messages_for_student(db: Session, student_id: int):
    messages = (
        db.query(models.SupportMessage)
        .filter(models.SupportMessage.student_id == student_id)
        .order_by(models.SupportMessage.created_at.desc())
        .all()
    )
    return messages


# LLM Chat Functions
def create_llm_chat(db: Session, user_id: int, course_id: int, title: str = "New Chat"):
    chat = models.LLMChat(
        course_id=course_id,
        user_id=user_id,
        title=title,
        messages_json="[]",
    )
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


def get_user_llm_chats(db: Session, user_id: int):
    chats = (
        db.query(models.LLMChat)
        .filter(models.LLMChat.user_id == user_id)
        .order_by(models.LLMChat.updated_at.desc())
        .all()
    )
    return chats


def get_llm_chat(db: Session, chat_id: int):
    chat = db.query(models.LLMChat).filter(models.LLMChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat


def add_llm_message(db: Session, chat_id: int, messages: list):
    chat = get_llm_chat(db, chat_id)
    current_messages = json.loads(chat.messages_json or "[]")
    current_messages.extend(messages)
    chat.messages_json = json.dumps(current_messages)
    chat.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(chat)
    return chat


def delete_llm_chat(db: Session, chat_id: int):
    chat = get_llm_chat(db, chat_id)
    db.delete(chat)
    db.commit()
    return {"detail": "Chat deleted successfully"}


# Course Thumbnail Functions
def update_course_thumbnail(db: Session, course_id: int, thumbnail_url: str):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.thumbnail_image_url = thumbnail_url
    db.commit()
    db.refresh(course)
    return course


def save_course_thumbnail(db: Session, course: models.Course, upload_file):
    content_type = upload_file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file")
    upload_root = Path(os.getenv("UPLOAD_DIR", "uploads")) / "course-thumbnails"
    upload_root.mkdir(parents=True, exist_ok=True)
    safe_name = Path(upload_file.filename or "course-thumbnail").name
    suffix = Path(safe_name).suffix or ".jpg"
    stored_filename = f"{course.slug}_{uuid4().hex}{suffix}"
    file_path = upload_root / stored_filename
    with file_path.open("wb") as target:
        shutil.copyfileobj(upload_file.file, target)
    course.thumbnail_image_url = f"/uploads/course-thumbnails/{stored_filename}"
    db.commit()
    db.refresh(course)
    return course


# Quiz Results & Ranking Functions
def get_quiz_results_with_ranking(db: Session, quiz_id: int, user_id: int):
    """Get quiz result with student's rank among all attempts"""
    attempt = (
        db.query(models.QuizAttempt)
        .filter(models.QuizAttempt.quiz_id == quiz_id, models.QuizAttempt.user_id == user_id)
        .order_by(models.QuizAttempt.completed_at.desc())
        .first()
    )
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")
    
    all_attempts = db.query(models.QuizAttempt).filter(models.QuizAttempt.quiz_id == quiz_id).all()
    sorted_attempts = sorted(all_attempts, key=lambda x: x.score, reverse=True)
    
    rank = next((i + 1 for i, a in enumerate(sorted_attempts) if a.id == attempt.id), len(sorted_attempts))
    passed_count = len([a for a in all_attempts if a.passed])
    failed_count = len(all_attempts) - passed_count
    
    return {
        "attempt": attempt,
        "rank": rank,
        "total_students": len(all_attempts),
        "passed_count": passed_count,
        "failed_count": failed_count,
    }


def get_contest_results_with_ranking(db: Session, contest_id: int, user_id: int):
    """Get contest result with student's rank"""
    contest = get_coding_contest(db, contest_id)
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    submissions = (
        db.query(models.CodingSubmission)
        .filter(models.CodingSubmission.contest_id == contest_id, models.CodingSubmission.user_id == user_id)
        .all()
    )

    best_by_question = {}
    for submission in submissions:
        current_best = best_by_question.get(submission.question_id)
        if current_best is None or submission.score > current_best.score:
            best_by_question[submission.question_id] = submission
    total_score = sum(s.score for s in best_by_question.values())
    
    all_submissions = (
        db.query(models.CodingSubmission)
        .filter(models.CodingSubmission.contest_id == contest_id)
        .all()
    )
    
    student_scores = {}
    for sub in all_submissions:
        student_scores.setdefault(sub.user_id, {})
        current_best = student_scores[sub.user_id].get(sub.question_id)
        if current_best is None or sub.score > current_best:
            student_scores[sub.user_id][sub.question_id] = sub.score
    
    totals_by_student = {student_id: sum(scores.values()) for student_id, scores in student_scores.items()}
    sorted_students = sorted(totals_by_student.items(), key=lambda x: x[1], reverse=True)
    rank = next((i + 1 for i, (uid, _) in enumerate(sorted_students) if uid == user_id), len(sorted_students))
    
    return {
        "total_score": total_score,
        "rank": rank,
        "total_students": len(set(s.user_id for s in all_submissions)),
        "submissions": submissions,
    }


# Assignment Scoring Functions
def grade_assignment_submission(db: Session, submission_id: int, score: int, feedback: str = None):
    """Grade an assignment submission"""
    if score < 0 or score > 100:
        raise HTTPException(status_code=400, detail="Assignment score must be between 0 and 100")
    submission = (
        db.query(models.AssignmentSubmission)
        .filter(models.AssignmentSubmission.id == submission_id)
        .first()
    )
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    submission.score = score
    submission.feedback = feedback
    submission.graded_at = datetime.utcnow()
    db.commit()
    db.refresh(submission)
    
    if submission.user and submission.user.email:
        assignment = submission.assignment

        html_email = email_templates.get_assignment_graded_email(
            submission.user.name,
            assignment.title,
            assignment.course.title if assignment.course else "Course",
            score,
            100,
            feedback
        )
        
        email_utils.send_email(
            submission.user.email,
            f"Assignment Graded: {assignment.title}",
            html_email,
            is_html=True
        )
    
    return submission
