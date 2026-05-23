from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from .. import auth as auth_module, crud, schemas
from ..deps import get_db
from ..models import UserRole

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})
    access_token = auth_module.create_access_token(data={"sub": user.username, "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register/student", response_model=schemas.UserResponse)
def register_student(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    return crud.create_user(db, user_in, role=UserRole.student)


@router.post("/register/trainer", response_model=schemas.UserResponse)
def register_trainer(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    return crud.create_user(db, user_in, role=UserRole.trainer)


@router.get("/me", response_model=schemas.UserResponse)
def read_current_user(current_user: schemas.UserResponse = Depends(auth_module.get_current_active_user)):
    return current_user
