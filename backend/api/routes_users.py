from fastapi import APIRouter
from schemas.schemas import UserProfile

router = APIRouter()

# Mock database
DB_USERS = {
    "u_123": {
        "user_id": "u_123",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "language_code": "en",
        "condition_id": "c_stroke_01",
        "fitness_level": "Med",
        "xp_total": 450,
        "rank_global": 1204
    }
}

@router.get("/profile/{user_id}", response_model=UserProfile)
async def get_user_profile(user_id: str):
    user = DB_USERS.get(user_id)
    if user:
        return UserProfile(**user)
    return {"error": "User not found"}
