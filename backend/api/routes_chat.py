from fastapi import APIRouter
from schemas.schemas import ChatRequest, ChatResponse
from services.groq_service import generate_chat_response

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_with_bot(request: ChatRequest):
    # Convert Pydantic models to dicts for the service
    messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    # Get response from Groq
    bot_response = generate_chat_response(
        messages,
        exercise_history=request.exercise_history,
        user_context=request.user_context,
        lang_code=request.lang_code,
    )
    
    return ChatResponse(response=bot_response)
