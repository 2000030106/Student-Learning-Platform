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


@router.put("/me", response_model=schemas.UserResponse)
def update_current_user(
    profile_in: schemas.UserProfileUpdate,
    current_user: schemas.UserResponse = Depends(auth_module.get_current_active_user),
    db: Session = Depends(get_db),
):
    return crud.update_user_profile(db, current_user.id, profile_in.model_dump())


@router.post("/change-password", response_model=schemas.MessageResponse)
def change_password(
    password_in: schemas.PasswordChange,
    current_user: schemas.UserResponse = Depends(auth_module.get_current_active_user),
    db: Session = Depends(get_db),
):
    crud.change_user_password(db, current_user.id, password_in.current_password, password_in.new_password)
    return {"detail": "Password changed successfully"}


@router.post("/otp-request")
def request_otp(otp_req: schemas.OTPRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, otp_req.username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    otp_token = crud.create_otp_token(db, user, otp_req.delivery_method)
    return {"detail": f"OTP sent to {otp_req.delivery_method}", "expires_in_minutes": 10}


@router.post("/otp-verify", response_model=schemas.Token)
def verify_otp(otp_verify: schemas.OTPVerify, db: Session = Depends(get_db)):
    user = crud.verify_otp_token(db, otp_verify.username, otp_verify.otp_code)
    access_token = auth_module.create_access_token(data={"sub": user.username, "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/profile", response_model=schemas.UserDetailResponse)
def get_profile(current_user: schemas.UserResponse = Depends(auth_module.get_current_active_user), db: Session = Depends(get_db)):
    user = crud.get_user_profile(db, current_user.id)
    return user


@router.post("/profile/picture", response_model=schemas.UserDetailResponse)
def upload_profile_picture(
    pic_data: schemas.ProfilePictureUpload,
    current_user: schemas.UserResponse = Depends(auth_module.get_current_active_user),
    db: Session = Depends(get_db),
):
    user = crud.update_profile_picture(db, current_user.id, pic_data.profile_pic_url)
    return user


@router.put("/profile/email-phone", response_model=schemas.UserDetailResponse)
def update_email_phone(
    update_data: schemas.UserProfileUpdate,
    current_user: schemas.UserResponse = Depends(auth_module.get_current_active_user),
    db: Session = Depends(get_db),
):
    user = crud.update_email_phone(db, current_user.id, update_data.email, update_data.phone)
    return user


@router.post("/profile/change-password", response_model=schemas.MessageResponse)
def change_password_new(
    pwd_change: schemas.ChangePasswordRequest,
    current_user: schemas.UserResponse = Depends(auth_module.get_current_active_user),
    db: Session = Depends(get_db),
):
    if pwd_change.new_password != pwd_change.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    return crud.change_password(db, current_user.id, pwd_change.current_password, pwd_change.new_password)
