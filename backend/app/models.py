from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
import enum
import json


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

    requests = relationship("CourseAccessRequest", back_populates="user", cascade="all, delete-orphan")
    trainer_requests = relationship("TrainerCourseRequest", back_populates="trainer", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(140), unique=True, nullable=False)
    slug = Column(String(140), unique=True, nullable=False)
    summary = Column(Text, nullable=False)
    audience = Column(String(120), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    requests = relationship("CourseAccessRequest", back_populates="course", cascade="all, delete-orphan")
    trainer_requests = relationship("TrainerCourseRequest", back_populates="course", cascade="all, delete-orphan")
    quizzes = relationship("CourseQuiz", back_populates="course", cascade="all, delete-orphan")
    coding_contests = relationship("CodingContest", back_populates="course", cascade="all, delete-orphan")
    learning_items = relationship(
        "CourseLearningItem",
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="CourseLearningItem.position",
    )


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

    @property
    def course_title(self):
        return self.course.title if self.course else None

    @property
    def course_slug(self):
        return self.course.slug if self.course else None

    @property
    def student_name(self):
        return self.user.name if self.user else None

    @property
    def student_username(self):
        return self.user.username if self.user else None

    @property
    def student_email(self):
        return self.user.email if self.user else None


class TrainerCourseRequest(Base):
    __tablename__ = "trainer_course_requests"

    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    status = Column(Enum(CourseAccessStatus), nullable=False, default=CourseAccessStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)

    trainer = relationship("User", back_populates="trainer_requests")
    course = relationship("Course", back_populates="trainer_requests")

    @property
    def course_title(self):
        return self.course.title if self.course else None

    @property
    def course_slug(self):
        return self.course.slug if self.course else None

    @property
    def trainer_name(self):
        return self.trainer.name if self.trainer else None

    @property
    def trainer_username(self):
        return self.trainer.username if self.trainer else None


class LearningItemKind(str, enum.Enum):
    overview = "overview"
    module = "module"
    quiz = "quiz"
    video = "video"


class CourseLearningItem(Base):
    __tablename__ = "course_learning_items"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    kind = Column(Enum(LearningItemKind), nullable=False)
    title = Column(String(160), nullable=False)
    body = Column(Text, nullable=False)
    resource_url = Column(String(500), nullable=True)
    position = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    course = relationship("Course", back_populates="learning_items")


class CourseQuiz(Base):
    __tablename__ = "course_quizzes"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    title = Column(String(180), nullable=False)
    description = Column(Text, nullable=False)
    time_limit_minutes = Column(Integer, nullable=False, default=10)
    passing_score = Column(Integer, nullable=False, default=60)
    starts_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)
    questions_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="quizzes")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("course_quizzes.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    answers_json = Column(Text, nullable=False)
    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    passed = Column(Boolean, default=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, default=datetime.utcnow)

    quiz = relationship("CourseQuiz", back_populates="attempts")
    user = relationship("User")

    @property
    def student_name(self):
        return self.user.name if self.user else None

    @property
    def student_username(self):
        return self.user.username if self.user else None

    @property
    def student_email(self):
        return self.user.email if self.user else None


class CodingLanguage(str, enum.Enum):
    web = "web"
    python = "python"
    java = "java"


class CodingContest(Base):
    __tablename__ = "coding_contests"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    title = Column(String(180), nullable=False)
    description = Column(Text, nullable=False)
    starts_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="coding_contests")
    questions = relationship("CodingQuestion", back_populates="contest", cascade="all, delete-orphan")
    submissions = relationship("CodingSubmission", back_populates="contest", cascade="all, delete-orphan")


class CodingQuestion(Base):
    __tablename__ = "coding_questions"

    id = Column(Integer, primary_key=True, index=True)
    contest_id = Column(Integer, ForeignKey("coding_contests.id"), nullable=False, index=True)
    title = Column(String(180), nullable=False)
    prompt = Column(Text, nullable=False)
    language = Column(Enum(CodingLanguage), nullable=False)
    starter_code = Column(Text, nullable=False)
    stdin = Column(Text, nullable=True)
    test_cases_json = Column(Text, nullable=False)
    marks = Column(Integer, nullable=False, default=10)
    position = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    contest = relationship("CodingContest", back_populates="questions")
    submissions = relationship("CodingSubmission", back_populates="question", cascade="all, delete-orphan")

    @property
    def test_cases(self):
        return json.loads(self.test_cases_json or "[]")


class CodingSubmission(Base):
    __tablename__ = "coding_submissions"

    id = Column(Integer, primary_key=True, index=True)
    contest_id = Column(Integer, ForeignKey("coding_contests.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("coding_questions.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    code = Column(Text, nullable=False)
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    score = Column(Integer, nullable=False, default=0)
    passed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    contest = relationship("CodingContest", back_populates="submissions")
    question = relationship("CodingQuestion", back_populates="submissions")
    user = relationship("User")

    @property
    def student_name(self):
        return self.user.name if self.user else None

    @property
    def student_username(self):
        return self.user.username if self.user else None
