import json
import requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import auth as auth_module, crud, schemas
from ..deps import get_db

router = APIRouter(prefix="/llm", tags=["llm"])

# Ollama API endpoint (running locally)
OLLAMA_API_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "mistral"  # You can change to other models like neural-chat, etc.


def call_ollama_api(messages: list[dict]):
    """Call Ollama API to get LLM response"""
    try:
        payload = {
            "model": OLLAMA_MODEL,
            "messages": messages,
            "stream": False,
        }
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()
        return result.get("message", {}).get("content", "I couldn't generate a response. Please try again.")
    except requests.exceptions.ConnectionError:
        return "LLM service is not available. Please ensure Ollama is running on http://localhost:11434"
    except Exception as e:
        return f"Error calling LLM: {str(e)}"


@router.post("/chats", response_model=schemas.LLMChatResponse2)
def create_chat(
    chat_create: schemas.LLMChatCreate,
    current_user: schemas.UserResponse = Depends(auth_module.get_current_active_user),
    db: Session = Depends(get_db),
):
    chat = crud.create_llm_chat(db, current_user.id, chat_create.course_id, chat_create.title)
    messages = json.loads(chat.messages_json or "[]")
    return {
        "id": chat.id,
        "course_id": chat.course_id,
        "user_id": chat.user_id,
        "title": chat.title,
        "messages": messages,
        "created_at": chat.created_at,
        "updated_at": chat.updated_at,
    }


@router.get("/chats", response_model=list[schemas.LLMChatResponse2])
def get_chats(
    current_user: schemas.UserResponse = Depends(auth_module.get_current_active_user),
    db: Session = Depends(get_db),
):
    chats = crud.get_user_llm_chats(db, current_user.id)
    result = []
    for chat in chats:
        messages = json.loads(chat.messages_json or "[]")
        result.append({
            "id": chat.id,
            "course_id": chat.course_id,
            "user_id": chat.user_id,
            "title": chat.title,
            "messages": messages,
            "created_at": chat.created_at,
            "updated_at": chat.updated_at,
        })
    return result


@router.get("/chats/{chat_id}", response_model=schemas.LLMChatResponse2)
def get_chat(
    chat_id: int,
    current_user: schemas.UserResponse = Depends(auth_module.get_current_active_user),
    db: Session = Depends(get_db),
):
    chat = crud.get_llm_chat(db, chat_id)
    if chat.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    messages = json.loads(chat.messages_json or "[]")
    return {
        "id": chat.id,
        "course_id": chat.course_id,
        "user_id": chat.user_id,
        "title": chat.title,
        "messages": messages,
        "created_at": chat.created_at,
        "updated_at": chat.updated_at,
    }


@router.post("/chats/{chat_id}/message")
def send_message(
    chat_id: int,
    msg: schemas.LLMChatMessage,
    current_user: schemas.UserResponse = Depends(auth_module.get_current_active_user),
    db: Session = Depends(get_db),
):
    chat = crud.get_llm_chat(db, chat_id)
    if chat.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    current_messages = json.loads(chat.messages_json or "[]")
    
    # Add user message
    user_message = {"role": "user", "content": msg.content}
    current_messages.append(user_message)
    
    # Get LLM response
    llm_response = call_ollama_api(current_messages)
    assistant_message = {"role": "assistant", "content": llm_response}
    current_messages.append(assistant_message)
    
    # Update chat in database
    chat_updated = crud.add_llm_message(db, chat_id, [user_message, assistant_message])
    
    messages = json.loads(chat_updated.messages_json or "[]")
    return {
        "id": chat_updated.id,
        "course_id": chat_updated.course_id,
        "user_id": chat_updated.user_id,
        "title": chat_updated.title,
        "messages": messages,
        "created_at": chat_updated.created_at,
        "updated_at": chat_updated.updated_at,
    }


@router.delete("/chats/{chat_id}")
def delete_chat(
    chat_id: int,
    current_user: schemas.UserResponse = Depends(auth_module.get_current_active_user),
    db: Session = Depends(get_db),
):
    chat = crud.get_llm_chat(db, chat_id)
    if chat.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return crud.delete_llm_chat(db, chat_id)
