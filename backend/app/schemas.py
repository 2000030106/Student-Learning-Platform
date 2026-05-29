from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


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


class UserResponse(UserBase, ORMModel):
    id: int
    role: str
    is_active: bool
    created_at: datetime


class UserProfileUpdate(BaseModel):
    email: EmailStr
    phone: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class CourseBase(BaseModel):
    title: str
    slug: str
    summary: str
    audience: str


class CourseCreate(CourseBase):
    pass


class CourseUpdate(CourseBase):
    pass


class CourseResponse(CourseBase, ORMModel):
    id: int
    created_at: datetime


class CourseAccessRequestBase(BaseModel):
    course_id: int


class CourseAccessRequestResponse(ORMModel):
    id: int
    course_id: int
    user_id: int
    course_title: Optional[str] = None
    course_slug: Optional[str] = None
    student_name: Optional[str] = None
    student_username: Optional[str] = None
    student_email: Optional[str] = None
    status: str
    created_at: datetime


class TrainerCourseRequestResponse(ORMModel):
    id: int
    course_id: int
    trainer_id: int
    course_title: Optional[str] = None
    course_slug: Optional[str] = None
    trainer_name: Optional[str] = None
    trainer_username: Optional[str] = None
    status: str
    created_at: datetime


class ApproveRequest(BaseModel):
    request_id: int
    approve: bool


class MessageResponse(BaseModel):
    detail: str


class LearningItemKind(str, Enum):
    overview = "overview"
    module = "module"
    quiz = "quiz"
    video = "video"


class LearningItemBase(BaseModel):
    kind: LearningItemKind
    title: str
    body: str
    resource_url: Optional[str] = None
    position: int = 0


class LearningItemCreate(LearningItemBase):
    pass


class LearningItemUpdate(LearningItemBase):
    pass


class LearningItemResponse(LearningItemBase, ORMModel):
    id: int
    course_id: int
    created_at: datetime
    updated_at: datetime


class CourseLearningResponse(BaseModel):
    course: CourseResponse
    access_status: Optional[str] = None
    overview: Optional[LearningItemResponse] = None
    modules: list[LearningItemResponse]
    quizzes: list[LearningItemResponse]
    videos: list[LearningItemResponse]


class QuizOption(BaseModel):
    id: str
    text: str


class QuizQuestion(BaseModel):
    id: str
    prompt: str
    type: str = "single"
    options: list[QuizOption]
    correct_option_ids: list[str]
    explanation: Optional[str] = None


class QuizQuestionPublic(BaseModel):
    id: str
    prompt: str
    type: str
    options: list[QuizOption]


class QuizCreate(BaseModel):
    title: str
    description: str
    time_limit_minutes: int = 10
    passing_score: int = 60
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    questions: list[QuizQuestion]


class QuizScheduleUpdate(BaseModel):
    time_limit_minutes: int
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


class QuizSummary(ORMModel):
    id: int
    course_id: int
    title: str
    description: str
    time_limit_minutes: int
    passing_score: int
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    created_at: datetime
    attempted: bool = False
    last_score: Optional[int] = None
    passed: Optional[bool] = None


class QuizDetail(QuizSummary):
    questions: list[QuizQuestionPublic]


class QuizAnswerSubmit(BaseModel):
    question_id: str
    selected_option_ids: list[str]


class QuizSubmit(BaseModel):
    answers: list[QuizAnswerSubmit]


class QuizAttemptResponse(ORMModel):
    id: int
    quiz_id: int
    user_id: int
    student_name: Optional[str] = None
    student_username: Optional[str] = None
    student_email: Optional[str] = None
    score: int
    total_questions: int
    passed: bool
    completed_at: datetime


class QuizReviewQuestion(BaseModel):
    id: str
    prompt: str
    type: str
    options: list[QuizOption]
    selected_option_ids: list[str]
    correct_option_ids: list[str]
    explanation: Optional[str] = None
    is_correct: bool


class QuizReview(BaseModel):
    attempt: QuizAttemptResponse
    questions: list[QuizReviewQuestion]


class QuizAnalytics(BaseModel):
    quiz_id: int
    title: str
    attempted: int
    passed: int
    failed: int
    pass_rate: int
    attempts: list[QuizAttemptResponse]
    not_attempted: list[CourseAccessRequestResponse] = []


class AssignmentCreate(BaseModel):
    title: str
    description: str
    questions: str
    due_at: Optional[datetime] = None


class AssignmentResponse(ORMModel):
    id: int
    course_id: int
    title: str
    description: str
    questions: str
    due_at: Optional[datetime] = None
    created_at: datetime
    submitted: bool = False


class AssignmentSubmissionResponse(ORMModel):
    id: int
    assignment_id: int
    user_id: int
    student_name: Optional[str] = None
    student_username: Optional[str] = None
    student_email: Optional[str] = None
    original_filename: str
    stored_filename: str
    content_type: Optional[str] = None
    note: Optional[str] = None
    submitted_at: datetime


class AssignmentAnalytics(BaseModel):
    assignment_id: int
    title: str
    submissions: list[AssignmentSubmissionResponse]
    not_submitted: list[CourseAccessRequestResponse] = []


class CodingTestCase(BaseModel):
    input: str = ""
    expected_output: str = ""
    hidden: bool = False
    check: Optional[str] = None


class CodingQuestionCreate(BaseModel):
    title: str
    prompt: str
    language: str
    starter_code: str
    stdin: Optional[str] = ""
    test_cases: list[CodingTestCase] = []
    marks: int = 10
    position: int = 1


class CodingQuestionResponse(CodingQuestionCreate, ORMModel):
    id: int
    contest_id: int
    created_at: datetime


class CodingContestCreate(BaseModel):
    title: str
    description: str
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    questions: list[CodingQuestionCreate]


class CodingContestResponse(ORMModel):
    id: int
    course_id: int
    title: str
    description: str
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    created_at: datetime
    questions: list[CodingQuestionResponse] = []


class CodingSubmissionCreate(BaseModel):
    question_id: int
    code: str


class CodingSubmissionResponse(ORMModel):
    id: int
    contest_id: int
    question_id: int
    user_id: int
    student_name: Optional[str] = None
    student_username: Optional[str] = None
    code: str
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    score: int
    passed: bool
    created_at: datetime


class CodingContestAnalytics(BaseModel):
    contest_id: int
    title: str
    submissions: int
    passed: int
    failed: int
    average_score: int
    attempts: list[CodingSubmissionResponse]
