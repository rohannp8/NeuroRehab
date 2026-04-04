"""
NeuroRehab Backend - FastAPI Application with Comprehensive Error Handling
Production-grade real-time ML rehabilitation platform
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import logging
import sys
import time
import io
from dotenv import load_dotenv
from pydantic import BaseModel

# Ensure console logging does not crash on Windows code pages when messages include emoji.
console_stream = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(console_stream),
        logging.FileHandler('backend.log', mode='a', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Import routers
from api.routes_chat import router as chat_router
from api.routes_users import router as users_router
from api.websockets_router import ws_router

# ═══════════════════════════════════════════════════════════════════════════════
# FASTAPI APP INITIALIZATION
# ═══════════════════════════════════════════════════════════════════════════════
app = FastAPI(
    title="NeuroRehab AI Backend",
    version="1.0.0",
    description="Real-time ML-powered rehabilitation platform"
)

# ═══════════════════════════════════════════════════════════════════════════════
# MIDDLEWARE SETUP
# ═══════════════════════════════════════════════════════════════════════════════

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
        "*"  # For development; restrict in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests and responses with timing."""
    start_time = time.time()
    
    try:
        # Execute request
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Log  the response
        logger.info(
            f"{request.method} {request.url.path} "
            f"- Status: {response.status_code} "
            f"- Time: {process_time:.3f}s"
        )
        
        # Add processing time header
        response.headers["X-Process-Time"] = str(process_time)
        return response
        
    except Exception as e:
        logger.error(f"Request error: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"}
        )

# ═══════════════════════════════════════════════════════════════════════════════
# GLOBAL EXCEPTION HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc)
        }
    )

# ═══════════════════════════════════════════════════════════════════════════════
# STARTUP & SHUTDOWN HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

@app.on_event("startup")
async def startup_event():
    """Initialize models and resources on application startup."""
    logger.info("\n" + "=" * 70)
    logger.info("🚀 NEUROREHAB BACKEND STARTING UP")
    logger.info("=" * 70 + "\n")
    
    try:
        # Import and initialize model loader
        from ml_core.model_loader import model_loader
        
        # The model_loader singleton initializes on import
        logger.info("\n✅ Model Loader Initialized")
        logger.info(f"   Loaded Models: {model_loader.get_loaded_models()}")
        logger.info(f"   Mocked Models: {model_loader.get_mocked_models()}")
        
        # Initialize pipeline
        from services.inference_pipeline import pipeline_instance
        logger.info("\n✅ Inference Pipeline Initialized and Ready")
        
        logger.info("\n" + "=" * 70)
        logger.info("✅ BACKEND STARTUP COMPLETE - READY FOR CONNECTIONS")
        logger.info("=" * 70 + "\n")
        
    except Exception as e:
        logger.critical(f"❌ FATAL STARTUP ERROR: {str(e)}", exc_info=True)
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on application shutdown."""
    logger.info("\n" + "=" * 70)
    logger.info("⏹️  NEUROREHAB BACKEND SHUTTING DOWN")
    logger.info("=" * 70 + "\n")

# ═══════════════════════════════════════════════════════════════════════════════
# API ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

# Include routers
app.include_router(chat_router, prefix="/api", tags=["Chat"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(ws_router, tags=["WebSockets"])

# Health check endpoint
@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    try:
        from ml_core.model_loader import model_loader
        from services.inference_pipeline import pipeline_instance
        
        return {
            "status": "healthy",
            "models_loaded": len(model_loader.get_loaded_models()),
            "pipeline_ready": pipeline_instance is not None
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

# ═══════════════════════════════════════════════════════════════════════════════
# SESSION MANAGEMENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

class StartSessionRequest(BaseModel):
    user_id: str = "anonymous"
    recent_metrics: dict = {"avg_deviation": 10.0, "completion_rate": 0.85, "fatigue": 20.0}

@app.post("/start-session")
async def start_session(req: StartSessionRequest):
    """Start a rehabilitation session with adaptive difficulty."""
    try:
        import sys
        model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model"))
        if model_dir not in sys.path:
            sys.path.insert(0, model_dir)
        
        from ml_core.model_loader import model_loader
        
        try:
            from m11_bayesian_adaptive_difficulty import M11BayesianAdaptiveDifficulty
            bayes_weights = model_loader.get_model("bayesian")
            adapter = M11BayesianAdaptiveDifficulty(bayes_weights)
            adaptive_targets = adapter.adapt_difficulty(req.recent_metrics)
        except Exception as e:
            logger.warning(f"M11 Adaptive Difficulty failed: {e}")
            adaptive_targets = {"target_rom": 90, "target_speed": 1.0}
        
        return {
            "status": "session started",
            "session_id": f"session_{int(time.time())}",
            "user_id": req.user_id,
            "adaptive_difficulty_targets": adaptive_targets
        }
    except Exception as e:
        logger.error(f"Session start error: {e}", exc_info=True)
        return {
            "status": "error",
            "error": str(e)
        }

class EndSessionRequest(BaseModel):
    user_id: str = "anonymous"
    session_frequency: float = 0.5
    activity_history: list = []

@app.post("/end-session")
async def end_session(req: EndSessionRequest):
    """End a session and calculate recovery metrics."""
    try:
        import sys
        model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model"))
        if model_dir not in sys.path:
            sys.path.insert(0, model_dir)
        
        from ml_core.model_loader import model_loader
        
        try:
            from m09_dqn_notification_agent import M09DQNNotificationAgent
            dqn_weights = model_loader.get_model("dqn")
            agent = M09DQNNotificationAgent(dqn_weights)
            notification_data = agent.predict_optimal_time(req.activity_history, req.session_frequency)
        except Exception as e:
            logger.warning(f"M09 DQN failed: {e}")
            notification_data = {"next_session_hours": 24}
        
        return {
            "status": "session ended successfully",
            "user_id": req.user_id,
            "next_notification_schedule": notification_data
        }
    except Exception as e:
        logger.error(f"Session end error: {e}", exc_info=True)
        return {
            "status": "error",
            "error": str(e)
        }

class AnalyticsRequest(BaseModel):
    user_id: str = "anonymous"
    historical_sessions: list = []

@app.post("/analytics")
async def get_analytics(req: AnalyticsRequest):
    """Get personalized analytics and recovery predictions."""
    try:
        import sys
        model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model"))
        if model_dir not in sys.path:
            sys.path.insert(0, model_dir)
        
        from ml_core.model_loader import model_loader
        
        try:
            from m10_xgboost_recovery_predictor import M10XGBoostRecoveryPredictor
            xgb_weights = model_loader.get_model("xgboost")
            predictor = M10XGBoostRecoveryPredictor(xgb_weights)
            recovery_metrics = predictor.predict_recovery(req.historical_sessions)
        except Exception as e:
            logger.warning(f"M10 XGBoost failed: {e}")
            recovery_metrics = {"recovery_rate": 0.5, "predicted_roi": 0.85}
        
        return {
            "status": "success",
            "user_id": req.user_id,
            "recovery_predictions": recovery_metrics,
            "last_updated": time.time()
        }
    except Exception as e:
        logger.error(f"Analytics error: {e}", exc_info=True)
        return {
            "status": "error",
            "error": str(e)
        }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API documentation."""
    return {
        "name": "NeuroRehab AI Backend",
        "version": "1.0.0",
        "status": "ready",
        "endpoints": {
            "health": "/health",
            "websocket_pose": "/ws/pose",
            "start_session": "POST /start-session",
            "end_session": "POST /end-session",
            "analytics": "POST /analytics",
            "chat": "/api/chat",
            "users": "/api/users"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting server on port {port}...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
