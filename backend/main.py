from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from api.routes_chat import router as chat_router
from api.routes_users import router as users_router
from api.websockets_router import ws_router

load_dotenv()

app = FastAPI(title="NeuroRehab AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(chat_router, prefix="/api", tags=["Chat"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(ws_router, tags=["WebSockets"])

@app.on_event("startup")
async def startup_event():
    from ml_core.model_loader import model_loader
    print("Application Startup Complete - Models Loaded into Memory")

class StartSessionRequest(BaseModel):
    user_id: str = "anonymous"
    recent_metrics: dict = {"avg_deviation": 10.0, "completion_rate": 0.85, "fatigue": 20.0}

@app.post("/start-session")
async def start_session(req: StartSessionRequest):
    import sys, os
    model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model"))
    if model_dir not in sys.path:
        sys.path.insert(0, model_dir)
        
    try:
        from ml_core.model_loader import model_loader
        from m11_bayesian_adaptive_difficulty import M11BayesianAdaptiveDifficulty
        
        bayes_weights = model_loader.get_model("bayesian")
        adapter = M11BayesianAdaptiveDifficulty(bayes_weights)
        
        # M11 Bayesian network calculates optimal parameters before starting the session
        adaptive_targets = adapter.adapt_difficulty(req.recent_metrics)
    except Exception as e:
         adaptive_targets = {"error": f"M11 Execution Failed: {str(e)}"}

    return {
        "status": "session started",
        "session_id": "1234abcd",
        "adaptive_difficulty_targets": adaptive_targets
    }

from pydantic import BaseModel

class EndSessionRequest(BaseModel):
    user_id: str = "anonymous"
    session_frequency: float = 0.5
    activity_history: list = []

@app.post("/end-session")
async def end_session(req: EndSessionRequest):
    import sys, os
    model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model"))
    if model_dir not in sys.path:
        sys.path.insert(0, model_dir)
        
    try:
        from ml_core.model_loader import model_loader
        from m09_dqn_notification_agent import M09DQNNotificationAgent
        
        dqn_weights = model_loader.get_model("dqn")
        agent = M09DQNNotificationAgent(dqn_weights)
        
        # M09 DQN runs asynchronously on session completion to calculate notification scheduling
        notification_data = agent.predict_optimal_time(req.activity_history, req.session_frequency)
    except Exception as e:
        notification_data = {"error": f"M09 Execution Failed: {str(e)}"}

    return {
        "status": "session ended successfully",
        "next_notification_schedule": notification_data
    }

class AnalyticsRequest(BaseModel):
    user_id: str = "anonymous"
    historical_sessions: list = []

@app.post("/analytics")
async def get_analytics(req: AnalyticsRequest):
    import sys, os
    model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model"))
    if model_dir not in sys.path:
        sys.path.insert(0, model_dir)
        
    try:
        from ml_core.model_loader import model_loader
        from m10_xgboost_recovery_predictor import M10XGBoostRecoveryPredictor
        
        xgb_weights = model_loader.get_model("xgboost")
        analyzer = M10XGBoostRecoveryPredictor(xgb_weights)
        
        # M10 Execution computing historical patient regression metrics
        analytics_data = analyzer.predict_recovery_timeline(req.historical_sessions)
    except Exception as e:
        analytics_data = {"error": f"M10 Execution Failed: {str(e)}"}

    return {
        "user_id": req.user_id,
        "analytics": analytics_data
    }

@app.get("/models/status")
async def get_models_status():
    from ml_core.model_loader import model_loader
    return {"status": "All models loaded", "count": len(model_loader._models)}

@app.get("/")
async def root():
    return {"message": "Welcome to the NeuroRehab AI Backend"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
