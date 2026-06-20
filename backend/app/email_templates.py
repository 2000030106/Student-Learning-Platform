from html import escape


BRAND = "Innolance Learning Platform"


def _layout(title: str, eyebrow: str, body: str, accent: str = "#2563eb") -> str:
    return f"""
    <!doctype html>
    <html>
      <body style="margin:0;background:#eef2f7;padding:24px;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dbe3ef;">
          <tr>
            <td style="background:{accent};padding:28px 32px;color:#ffffff;">
              <div style="font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;opacity:.82;">{escape(eyebrow)}</div>
              <h1 style="margin:8px 0 0;font-size:28px;line-height:1.2;">{escape(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px;">
              {body}
              <p style="margin:28px 0 0;color:#475569;">Best regards,<br><strong>{BRAND}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#f8fafc;color:#64748b;font-size:12px;text-align:center;">
              This is an automated message from {BRAND}.
            </td>
          </tr>
        </table>
      </body>
    </html>
    """


def _metric(label: str, value: str, accent: str = "#2563eb") -> str:
    return f"""
      <td style="width:50%;padding:8px;">
        <div style="border:1px solid #e2e8f0;border-radius:14px;padding:16px;background:#f8fafc;">
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:800;letter-spacing:.08em;">{escape(label)}</div>
          <div style="font-size:26px;font-weight:900;color:{accent};margin-top:4px;">{escape(value)}</div>
        </div>
      </td>
    """


def get_submission_email(student_name: str, item_title: str, course_title: str, item_type: str) -> str:
    item_label = item_type.title()
    body = f"""
      <p style="margin-top:0;">Hi <strong>{escape(student_name)}</strong>,</p>
      <p>Your {escape(item_type)} submission was received successfully.</p>
      <div style="border-left:4px solid #22c55e;background:#f0fdf4;padding:16px 18px;border-radius:12px;margin:22px 0;">
        <p style="margin:0 0 8px;"><strong>{escape(item_label)}:</strong> {escape(item_title)}</p>
        <p style="margin:0 0 8px;"><strong>Course:</strong> {escape(course_title)}</p>
        <p style="margin:0;"><strong>Status:</strong> Submitted successfully</p>
      </div>
      <p>We will notify you when results or grading updates are available.</p>
    """
    return _layout(f"{item_label} Submitted", "Submission received", body, "#16a34a")


def get_quiz_results_email(
    student_name: str,
    quiz_title: str,
    course_title: str,
    score: int,
    total_questions: int,
    correct_count: int,
    wrong_count: int,
    passed: bool,
    rank: int,
    total_students: int,
    class_passed: int,
    class_failed: int,
    question_rows: list[dict],
) -> str:
    accent = "#16a34a" if passed else "#dc2626"
    status = "Passed" if passed else "Needs practice"
    rows = "".join(
        f"""
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;">{escape(row.get("prompt", "Question"))}</td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;color:{'#16a34a' if row.get('is_correct') else '#dc2626'};font-weight:800;">{"Correct" if row.get("is_correct") else "Incorrect"}</td>
        </tr>
        """
        for row in question_rows
    )
    body = f"""
      <p style="margin-top:0;">Hi <strong>{escape(student_name)}</strong>,</p>
      <p>Your quiz has been evaluated. Here is your result for <strong>{escape(quiz_title)}</strong> in {escape(course_title)}.</p>
      <div style="background:{accent};color:#ffffff;border-radius:18px;padding:24px;text-align:center;margin:22px 0;">
        <div style="font-size:13px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;">Total Score</div>
        <div style="font-size:48px;font-weight:900;line-height:1;margin:10px 0;">{score}%</div>
        <div style="font-size:18px;font-weight:800;">{status}</div>
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>{_metric("Questions", str(total_questions), accent)}{_metric("Rank", f"#{rank} of {total_students}", accent)}</tr>
        <tr>{_metric("Correct", str(correct_count), "#16a34a")}{_metric("Incorrect", str(wrong_count), "#dc2626")}</tr>
      </table>
      <div style="margin:18px 0;padding:14px 16px;background:#f8fafc;border-radius:12px;color:#475569;">
        Class summary: {class_passed} passed and {class_failed} failed.
      </div>
      <h2 style="font-size:18px;margin:24px 0 10px;">Question Review</h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">{rows}</table>
    """
    return _layout("Quiz Results", "Result published", body, accent)


def get_contest_results_email(
    student_name: str,
    contest_title: str,
    course_title: str,
    total_score: int,
    max_score: int,
    rank: int,
    total_students: int,
    passed_count: int,
    failed_count: int,
    question_rows: list[dict],
) -> str:
    percentage = round((total_score / max_score) * 100) if max_score else 0
    rows = "".join(
        f"""
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;">{escape(row.get("title", "Question"))}</td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:800;color:{'#16a34a' if row.get('passed') else '#dc2626'};">
            {row.get("score", 0)}/{row.get("max_score", 0)} - {"Passed" if row.get("passed") else "Failed"}
          </td>
        </tr>
        """
        for row in question_rows
    )
    body = f"""
      <p style="margin-top:0;">Hi <strong>{escape(student_name)}</strong>,</p>
      <p>Your coding contest submission has been evaluated.</p>
      <div style="background:#ea580c;color:#ffffff;border-radius:18px;padding:24px;text-align:center;margin:22px 0;">
        <div style="font-size:13px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;">Total Score</div>
        <div style="font-size:48px;font-weight:900;line-height:1;margin:10px 0;">{total_score}/{max_score}</div>
        <div style="font-size:18px;font-weight:800;">{percentage}%</div>
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>{_metric("Contest", contest_title, "#ea580c")}{_metric("Rank", f"#{rank} of {total_students}", "#ea580c")}</tr>
        <tr>{_metric("Passed Questions", str(passed_count), "#16a34a")}{_metric("Failed Questions", str(failed_count), "#dc2626")}</tr>
      </table>
      <h2 style="font-size:18px;margin:24px 0 10px;">Question Scores</h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">{rows}</table>
    """
    return _layout("Coding Contest Results", "Score published", body, "#ea580c")


def get_assignment_graded_email(
    student_name: str,
    assignment_title: str,
    course_title: str,
    score: int,
    max_score: int,
    feedback: str | None = None,
) -> str:
    percentage = round((score / max_score) * 100) if max_score else 0
    feedback_html = (
        f"""
        <div style="margin:20px 0;padding:16px 18px;background:#fff7ed;border-left:4px solid #f97316;border-radius:12px;">
          <strong>Trainer feedback</strong>
          <p style="margin:8px 0 0;">{escape(feedback)}</p>
        </div>
        """
        if feedback
        else ""
    )
    body = f"""
      <p style="margin-top:0;">Hi <strong>{escape(student_name)}</strong>,</p>
      <p>Your assignment has been graded.</p>
      <div style="background:#2563eb;color:#ffffff;border-radius:18px;padding:24px;text-align:center;margin:22px 0;">
        <div style="font-size:13px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;">Assignment Score</div>
        <div style="font-size:48px;font-weight:900;line-height:1;margin:10px 0;">{score}/{max_score}</div>
        <div style="font-size:18px;font-weight:800;">{percentage}%</div>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#f8fafc;">
        <p style="margin:0 0 8px;"><strong>Assignment:</strong> {escape(assignment_title)}</p>
        <p style="margin:0;"><strong>Course:</strong> {escape(course_title)}</p>
      </div>
      {feedback_html}
    """
    return _layout("Assignment Graded", "Score published", body, "#2563eb")
