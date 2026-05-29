from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import schemas, crud, auth
from ..deps import get_db

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("/", response_model=list[schemas.CourseResponse])
def read_courses(db: Session = Depends(get_db)):
    return crud.list_courses(db)


@router.post("/", response_model=schemas.CourseResponse)
def create_course(
    course_in: schemas.CourseCreate,
    current_user: schemas.UserResponse = Depends(auth.require_role(["admin"])),
    db: Session = Depends(get_db),
):
    return crud.create_course(db, course_in.model_dump())


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


@router.post("/{course_slug}/trainer-request", response_model=schemas.TrainerCourseRequestResponse)
def request_course_to_teach(
    course_slug: str,
    current_user: schemas.UserResponse = Depends(auth.require_role(["trainer"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return crud.create_trainer_course_request(db, current_user.id, course.id)


@router.put("/{course_slug}", response_model=schemas.CourseResponse)
def update_course(
    course_slug: str,
    course_in: schemas.CourseUpdate,
    current_user: schemas.UserResponse = Depends(auth.require_role(["admin"])),
    db: Session = Depends(get_db),
):
    return crud.update_course_by_slug(db, course_slug, course_in.model_dump())


@router.delete("/{course_slug}", response_model=schemas.MessageResponse)
def delete_course(
    course_slug: str,
    current_user: schemas.UserResponse = Depends(auth.require_role(["admin"])),
    db: Session = Depends(get_db),
):
    crud.delete_course_by_slug(db, course_slug)
    return {"detail": "Course deleted successfully"}


@router.get("/requests/me", response_model=list[schemas.CourseAccessRequestResponse])
def my_access_requests(current_user: schemas.UserResponse = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    return crud.list_user_requests(db, current_user.id)


@router.get("/requests/pending", response_model=list[schemas.CourseAccessRequestResponse])
def pending_requests(current_user: schemas.UserResponse = Depends(auth.require_role(["trainer", "admin"])), db: Session = Depends(get_db)):
    return crud.list_pending_requests(db)


@router.get("/requests/all", response_model=list[schemas.CourseAccessRequestResponse])
def all_requests(current_user: schemas.UserResponse = Depends(auth.require_role(["admin"])), db: Session = Depends(get_db)):
    return crud.list_all_requests(db)


@router.post("/requests/approve", response_model=schemas.CourseAccessRequestResponse)
def approve_request(
    decision: schemas.ApproveRequest,
    current_user: schemas.UserResponse = Depends(auth.require_role(["admin"])),
    db: Session = Depends(get_db),
):
    return crud.update_request_status(db, decision.request_id, decision.approve)


@router.get("/admin/users", response_model=list[schemas.UserResponse])
def admin_users(current_user: schemas.UserResponse = Depends(auth.require_role(["admin"])), db: Session = Depends(get_db)):
    return crud.list_users(db)


@router.get("/trainer-requests/me", response_model=list[schemas.TrainerCourseRequestResponse])
def my_trainer_course_requests(
    current_user: schemas.UserResponse = Depends(auth.require_role(["trainer"])),
    db: Session = Depends(get_db),
):
    return crud.list_trainer_requests(db, current_user.id)


@router.get("/trainer-requests/pending", response_model=list[schemas.TrainerCourseRequestResponse])
def pending_trainer_course_requests(
    current_user: schemas.UserResponse = Depends(auth.require_role(["admin"])),
    db: Session = Depends(get_db),
):
    return crud.list_pending_trainer_requests(db)


@router.post("/trainer-requests/approve", response_model=schemas.TrainerCourseRequestResponse)
def approve_trainer_course_request(
    decision: schemas.ApproveRequest,
    current_user: schemas.UserResponse = Depends(auth.require_role(["admin"])),
    db: Session = Depends(get_db),
):
    return crud.update_trainer_request_status(db, decision.request_id, decision.approve)


def _role_value(current_user):
    return current_user.role.value if hasattr(current_user.role, "value") else current_user.role


def _format_learning_response(course, access_status, items):
    overview = next((item for item in items if item.kind == "overview"), None)
    return {
        "course": course,
        "access_status": access_status,
        "overview": overview,
        "modules": [item for item in items if item.kind == "module"],
        "quizzes": [item for item in items if item.kind == "quiz"],
        "videos": [item for item in items if item.kind == "video"],
    }


@router.get("/{course_slug}/access")
def course_access_status(
    course_slug: str,
    current_user: schemas.UserResponse = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    role = _role_value(current_user)
    if role == "admin":
        return {"status": "approved"}
    if role == "trainer":
        trainer_status = crud.get_trainer_course_status(db, current_user.id, course.id)
        return {"status": "approved" if trainer_status == "approved" else trainer_status, "trainer_status": trainer_status}
    return {"status": crud.get_course_access_status(db, current_user.id, course.id)}


@router.get("/{course_slug}/learning", response_model=schemas.CourseLearningResponse)
def read_course_learning(
    course_slug: str,
    current_user: schemas.UserResponse = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    role = _role_value(current_user)
    if role == "admin":
        access_status = "approved"
    elif role == "trainer":
        access_status = "approved" if crud.can_trainer_manage_course(db, current_user.id, course.id) else None
    else:
        access_status = crud.get_course_access_status(db, current_user.id, course.id)
    if access_status != "approved":
        raise HTTPException(status_code=403, detail="Course access is not approved")
    crud.ensure_default_learning_items(db, course)
    return _format_learning_response(course, access_status, crud.list_learning_items(db, course.id))


@router.post("/{course_slug}/learning-items", response_model=schemas.LearningItemResponse)
def create_course_learning_item(
    course_slug: str,
    item_in: schemas.LearningItemCreate,
    current_user: schemas.UserResponse = Depends(auth.require_role(["trainer", "admin"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if _role_value(current_user) == "trainer" and not crud.can_trainer_manage_course(db, current_user.id, course.id):
        raise HTTPException(status_code=403, detail="Admin approval is required before editing this course")
    return crud.create_learning_item(db, course.id, item_in.model_dump())


@router.put("/{course_slug}/learning-items/{item_id}", response_model=schemas.LearningItemResponse)
def update_course_learning_item(
    course_slug: str,
    item_id: int,
    item_in: schemas.LearningItemUpdate,
    current_user: schemas.UserResponse = Depends(auth.require_role(["trainer", "admin"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    item = crud.get_learning_item(db, item_id)
    if not course or not item or item.course_id != course.id:
        raise HTTPException(status_code=404, detail="Learning item not found")
    if _role_value(current_user) == "trainer" and not crud.can_trainer_manage_course(db, current_user.id, course.id):
        raise HTTPException(status_code=403, detail="Admin approval is required before editing this course")
    return crud.update_learning_item(db, item_id, item_in.model_dump())


@router.delete("/{course_slug}/learning-items/{item_id}", response_model=schemas.MessageResponse)
def delete_course_learning_item(
    course_slug: str,
    item_id: int,
    current_user: schemas.UserResponse = Depends(auth.require_role(["trainer", "admin"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    item = crud.get_learning_item(db, item_id)
    if not course or not item or item.course_id != course.id:
        raise HTTPException(status_code=404, detail="Learning item not found")
    if _role_value(current_user) == "trainer" and not crud.can_trainer_manage_course(db, current_user.id, course.id):
        raise HTTPException(status_code=403, detail="Admin approval is required before editing this course")
    crud.delete_learning_item(db, item_id)
    return {"detail": "Learning item deleted successfully"}


def _can_manage_course(current_user, course, db):
    role = _role_value(current_user)
    return role == "admin" or (role == "trainer" and crud.can_trainer_manage_course(db, current_user.id, course.id))


def _ensure_can_view_course_quizzes(current_user, course, db):
    role = _role_value(current_user)
    if role == "admin":
        return
    if role == "trainer":
        if not crud.can_trainer_manage_course(db, current_user.id, course.id):
            raise HTTPException(status_code=403, detail="Admin approval is required")
        return
    if crud.get_course_access_status(db, current_user.id, course.id) != "approved":
        raise HTTPException(status_code=403, detail="Course access is not approved")


def _ensure_can_view_course_assignments(current_user, course, db):
    _ensure_can_view_course_quizzes(current_user, course, db)


@router.get("/{course_slug}/quizzes", response_model=list[schemas.QuizSummary])
def list_course_quizzes(
    course_slug: str,
    current_user: schemas.UserResponse = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    _ensure_can_view_course_quizzes(current_user, course, db)
    return crud.list_quizzes(db, course.id, current_user.id)


@router.post("/{course_slug}/quizzes", response_model=schemas.QuizSummary)
def create_course_quiz(
    course_slug: str,
    quiz_in: schemas.QuizCreate,
    current_user: schemas.UserResponse = Depends(auth.require_role(["trainer", "admin"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if not _can_manage_course(current_user, course, db):
        raise HTTPException(status_code=403, detail="Admin approval is required before creating quizzes")
    quiz = crud.create_quiz(db, course.id, quiz_in.model_dump())
    return crud.list_quizzes(db, course.id, current_user.id)[-1]


@router.put("/{course_slug}/quizzes/{quiz_id}/schedule", response_model=schemas.QuizSummary)
def update_course_quiz_schedule(
    course_slug: str,
    quiz_id: int,
    schedule_in: schemas.QuizScheduleUpdate,
    current_user: schemas.UserResponse = Depends(auth.require_role(["trainer", "admin"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    quiz = crud.get_quiz(db, quiz_id)
    if not course or not quiz or quiz.course_id != course.id:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not _can_manage_course(current_user, course, db):
        raise HTTPException(status_code=403, detail="Admin approval is required")
    crud.update_quiz_schedule(db, quiz, schedule_in.model_dump())
    return next(item for item in crud.list_quizzes(db, course.id, current_user.id) if item["id"] == quiz.id)


@router.get("/{course_slug}/quizzes/{quiz_id}", response_model=schemas.QuizDetail)
def read_course_quiz(
    course_slug: str,
    quiz_id: int,
    current_user: schemas.UserResponse = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    quiz = crud.get_quiz(db, quiz_id)
    if not course or not quiz or quiz.course_id != course.id:
        raise HTTPException(status_code=404, detail="Quiz not found")
    _ensure_can_view_course_quizzes(current_user, course, db)
    if _role_value(current_user) == "student":
        now = datetime.utcnow()
        if quiz.starts_at and now < quiz.starts_at:
            raise HTTPException(status_code=403, detail="Quiz is not open yet")
        if quiz.ends_at and now > quiz.ends_at:
            raise HTTPException(status_code=403, detail="Quiz schedule is closed")
    return crud.get_quiz_detail(db, quiz, current_user.id)


@router.post("/{course_slug}/quizzes/{quiz_id}/attempt", response_model=schemas.QuizAttemptResponse)
def submit_course_quiz(
    course_slug: str,
    quiz_id: int,
    attempt_in: schemas.QuizSubmit,
    current_user: schemas.UserResponse = Depends(auth.require_role(["student"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    quiz = crud.get_quiz(db, quiz_id)
    if not course or not quiz or quiz.course_id != course.id:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if crud.get_course_access_status(db, current_user.id, course.id) != "approved":
        raise HTTPException(status_code=403, detail="Course access is not approved")
    now = datetime.utcnow()
    if quiz.starts_at and now < quiz.starts_at:
        raise HTTPException(status_code=403, detail="Quiz is not open yet")
    if quiz.ends_at and now > quiz.ends_at:
        raise HTTPException(status_code=403, detail="Quiz schedule is closed")
    return crud.submit_quiz_attempt(db, quiz, current_user.id, [answer.model_dump() for answer in attempt_in.answers])


@router.get("/{course_slug}/quizzes/{quiz_id}/review", response_model=schemas.QuizReview)
def read_course_quiz_review(
    course_slug: str,
    quiz_id: int,
    current_user: schemas.UserResponse = Depends(auth.require_role(["student"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    quiz = crud.get_quiz(db, quiz_id)
    if not course or not quiz or quiz.course_id != course.id:
        raise HTTPException(status_code=404, detail="Quiz not found")
    attempt = crud.get_latest_quiz_attempt(db, quiz.id, current_user.id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz result not found")
    return crud.get_quiz_review(db, quiz, attempt)


@router.get("/{course_slug}/quizzes/{quiz_id}/analytics", response_model=schemas.QuizAnalytics)
def read_course_quiz_analytics(
    course_slug: str,
    quiz_id: int,
    current_user: schemas.UserResponse = Depends(auth.require_role(["trainer", "admin"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    quiz = crud.get_quiz(db, quiz_id)
    if not course or not quiz or quiz.course_id != course.id:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not _can_manage_course(current_user, course, db):
        raise HTTPException(status_code=403, detail="Admin approval is required")
    return crud.get_quiz_analytics(db, quiz)


@router.get("/{course_slug}/assignments", response_model=list[schemas.AssignmentResponse])
def list_course_assignments(
    course_slug: str,
    current_user: schemas.UserResponse = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    _ensure_can_view_course_assignments(current_user, course, db)
    return crud.list_assignments(db, course.id, current_user.id)


@router.post("/{course_slug}/assignments", response_model=schemas.AssignmentResponse)
def create_course_assignment(
    course_slug: str,
    assignment_in: schemas.AssignmentCreate,
    current_user: schemas.UserResponse = Depends(auth.require_role(["trainer", "admin"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if not _can_manage_course(current_user, course, db):
        raise HTTPException(status_code=403, detail="Admin approval is required before creating assignments")
    assignment = crud.create_assignment(db, course.id, assignment_in.model_dump())
    return crud.list_assignments(db, course.id, current_user.id)[0] if assignment else None


@router.post("/{course_slug}/assignments/{assignment_id}/submit", response_model=schemas.AssignmentSubmissionResponse)
def submit_course_assignment(
    course_slug: str,
    assignment_id: int,
    note: str = Form(""),
    file: UploadFile = File(...),
    current_user: schemas.UserResponse = Depends(auth.require_role(["student"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    assignment = crud.get_assignment(db, assignment_id)
    if not course or not assignment or assignment.course_id != course.id:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if crud.get_course_access_status(db, current_user.id, course.id) != "approved":
        raise HTTPException(status_code=403, detail="Course access is not approved")
    return crud.submit_assignment(db, assignment, current_user, file, note)


@router.get("/{course_slug}/assignments/{assignment_id}/analytics", response_model=schemas.AssignmentAnalytics)
def read_course_assignment_analytics(
    course_slug: str,
    assignment_id: int,
    current_user: schemas.UserResponse = Depends(auth.require_role(["trainer", "admin"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    assignment = crud.get_assignment(db, assignment_id)
    if not course or not assignment or assignment.course_id != course.id:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if not _can_manage_course(current_user, course, db):
        raise HTTPException(status_code=403, detail="Admin approval is required")
    return crud.get_assignment_analytics(db, assignment)


@router.get("/{course_slug}/assignments/{assignment_id}/submissions/{submission_id}/download")
def download_assignment_submission(
    course_slug: str,
    assignment_id: int,
    submission_id: int,
    current_user: schemas.UserResponse = Depends(auth.require_role(["trainer", "admin"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    assignment = crud.get_assignment(db, assignment_id)
    if not course or not assignment or assignment.course_id != course.id:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if not _can_manage_course(current_user, course, db):
        raise HTTPException(status_code=403, detail="Admin approval is required")
    submission = next((item for item in assignment.submissions if item.id == submission_id), None)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return FileResponse(submission.file_path, filename=submission.original_filename)


@router.get("/{course_slug}/coding-contests", response_model=list[schemas.CodingContestResponse])
def list_course_coding_contests(
    course_slug: str,
    current_user: schemas.UserResponse = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    role = _role_value(current_user)
    if role == "student" and crud.get_course_access_status(db, current_user.id, course.id) != "approved":
        raise HTTPException(status_code=403, detail="Course access is not approved")
    if role == "trainer" and not crud.can_trainer_manage_course(db, current_user.id, course.id):
        raise HTTPException(status_code=403, detail="Admin approval is required")
    return crud.list_coding_contests(db, course.id)


@router.post("/{course_slug}/coding-contests", response_model=schemas.CodingContestResponse)
def create_course_coding_contest(
    course_slug: str,
    contest_in: schemas.CodingContestCreate,
    current_user: schemas.UserResponse = Depends(auth.require_role(["trainer", "admin"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if not _can_manage_course(current_user, course, db):
        raise HTTPException(status_code=403, detail="Admin approval is required before creating contests")
    return crud.create_coding_contest(db, course.id, contest_in.model_dump())


@router.delete("/{course_slug}/coding-contests/{contest_id}", response_model=schemas.MessageResponse)
def delete_course_coding_contest(
    course_slug: str,
    contest_id: int,
    current_user: schemas.UserResponse = Depends(auth.require_role(["trainer", "admin"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    contest = crud.get_coding_contest(db, contest_id)
    if not course or not contest or contest.course_id != course.id:
        raise HTTPException(status_code=404, detail="Coding contest not found")
    if not _can_manage_course(current_user, course, db):
        raise HTTPException(status_code=403, detail="Admin approval is required")
    crud.delete_coding_contest(db, contest.id)
    return {"detail": "Coding contest deleted successfully"}


@router.post("/{course_slug}/coding-contests/{contest_id}/submit", response_model=schemas.CodingSubmissionResponse)
def submit_course_coding_contest(
    course_slug: str,
    contest_id: int,
    submission_in: schemas.CodingSubmissionCreate,
    current_user: schemas.UserResponse = Depends(auth.require_role(["student"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    contest = crud.get_coding_contest(db, contest_id)
    if not course or not contest or contest.course_id != course.id:
        raise HTTPException(status_code=404, detail="Coding contest not found")
    if crud.get_course_access_status(db, current_user.id, course.id) != "approved":
        raise HTTPException(status_code=403, detail="Course access is not approved")
    now = datetime.utcnow()
    if contest.starts_at and now < contest.starts_at:
        raise HTTPException(status_code=403, detail="Coding contest is not open yet")
    if contest.ends_at and now > contest.ends_at:
        raise HTTPException(status_code=403, detail="Coding contest schedule is closed")
    return crud.submit_coding_answer(db, contest, submission_in.question_id, current_user.id, submission_in.code)


@router.get("/{course_slug}/coding-contests/{contest_id}/analytics", response_model=schemas.CodingContestAnalytics)
def read_course_coding_contest_analytics(
    course_slug: str,
    contest_id: int,
    current_user: schemas.UserResponse = Depends(auth.require_role(["trainer", "admin"])),
    db: Session = Depends(get_db),
):
    course = crud.get_course_by_slug(db, course_slug)
    contest = crud.get_coding_contest(db, contest_id)
    if not course or not contest or contest.course_id != course.id:
        raise HTTPException(status_code=404, detail="Coding contest not found")
    if not _can_manage_course(current_user, course, db):
        raise HTTPException(status_code=403, detail="Admin approval is required")
    return crud.get_coding_contest_analytics(db, contest)
