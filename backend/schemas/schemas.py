from pydantic import BaseModel
from typing import List, Optional

class UserProfile(BaseModel):
    user_id: str
    name: str
    email: str
    language_code: str
    condition_id: str
    fitness_level: str
    xp_total: int
    rank_global: int

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_id: Optional[str] = None
    
class ChatResponse(BaseModel):
    response: str
