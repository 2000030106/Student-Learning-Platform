import os
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .. import auth, schemas

router = APIRouter(prefix="/code", tags=["code"])

RUN_TIMEOUT_SECONDS = 5


class CodeRunRequest(BaseModel):
    language: str
    code: str
    stdin: str = ""


class CodeRunResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    timed_out: bool = False


def _run_command(command: list[str], cwd: str, stdin: str = ""):
    try:
        completed = subprocess.run(
            command,
            input=stdin,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=RUN_TIMEOUT_SECONDS,
        )
        return CodeRunResponse(
            stdout=completed.stdout,
            stderr=completed.stderr,
            exit_code=completed.returncode,
        )
    except subprocess.TimeoutExpired as exc:
        return CodeRunResponse(
            stdout=exc.stdout or "",
            stderr=(exc.stderr or "") + f"\nExecution timed out after {RUN_TIMEOUT_SECONDS} seconds.",
            exit_code=124,
            timed_out=True,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=400, detail=f"Runner not found: {command[0]}")


def _format_sql_rows(headers, rows):
    if not headers:
        return "Statement executed successfully."
    values = [[str(value) if value is not None else "NULL" for value in row] for row in rows]
    widths = [
        max(len(header), *(len(row[index]) for row in values)) if values else len(header)
        for index, header in enumerate(headers)
    ]
    separator = "-+-".join("-" * width for width in widths)
    header_line = " | ".join(header.ljust(widths[index]) for index, header in enumerate(headers))
    body = [" | ".join(row[index].ljust(widths[index]) for index in range(len(headers))) for row in values]
    return "\n".join([header_line, separator, *body, f"\n{len(rows)} row(s) returned."])


def _run_sql(code: str):
    try:
        statements = [statement.strip() for statement in code.split(";") if statement.strip()]
        if not statements:
            return CodeRunResponse(stdout="", stderr="No SQL statement to run.", exit_code=1)
        connection = sqlite3.connect(":memory:")
        try:
            cursor = connection.cursor()
            output = []
            for statement in statements:
                cursor.execute(statement)
                if cursor.description:
                    headers = [column[0] for column in cursor.description]
                    output.append(_format_sql_rows(headers, cursor.fetchall()))
            connection.commit()
            return CodeRunResponse(stdout="\n\n".join(output) or "Statement executed successfully.", stderr="", exit_code=0)
        finally:
            connection.close()
    except sqlite3.Error as exc:
        return CodeRunResponse(stdout="", stderr=str(exc), exit_code=1)


@router.post("/run", response_model=CodeRunResponse)
def run_code(
    payload: CodeRunRequest,
    current_user: schemas.UserResponse = Depends(auth.get_current_active_user),
):
    language = payload.language.lower()
    if language not in {"python", "java", "sql"}:
        raise HTTPException(status_code=400, detail="Only python, java, and sql are supported")

    if language == "sql":
        return _run_sql(payload.code)

    with tempfile.TemporaryDirectory(prefix="student-code-") as temp_dir:
        workdir = Path(temp_dir)
        if language == "python":
            source = workdir / "main.py"
            source.write_text(payload.code, encoding="utf-8")
            return _run_command([sys.executable, str(source)], cwd=temp_dir, stdin=payload.stdin)

        source = workdir / "Main.java"
        source.write_text(payload.code, encoding="utf-8")
        compile_result = _run_command(["javac", str(source)], cwd=temp_dir)
        if compile_result.exit_code != 0:
            return compile_result
        classpath = os.fspath(workdir)
        return _run_command(["java", "-cp", classpath, "Main"], cwd=temp_dir, stdin=payload.stdin)
