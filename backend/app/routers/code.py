import os
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


@router.post("/run", response_model=CodeRunResponse)
def run_code(
    payload: CodeRunRequest,
    current_user: schemas.UserResponse = Depends(auth.get_current_active_user),
):
    language = payload.language.lower()
    if language not in {"python", "java"}:
        raise HTTPException(status_code=400, detail="Only python and java are supported")

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
