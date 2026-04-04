from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging
import asyncio
import base64
import sys
import os
import time

model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "model"))
if model_dir not in sys.path:
    sys.path.insert(0, model_dir)

from services.inference_pipeline import pipeline_instance

# Configure logging
logger = logging.getLogger(__name__)

# Lazy load the TTS module
tts_coach = None
def get_tts_coach():
    global tts_coach
    if tts_coach is None:
        try:
            import importlib.util
            tts_path = os.path.join(os.path.dirname(__file__), "..", "..", "model", "06_tts_voice.py")
            tts_path = os.path.abspath(tts_path)
            spec = importlib.util.spec_from_file_location("tts_voice_module", tts_path)
            tts_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(tts_module)
            tts_coach = tts_module.VoiceCoachTTS(autoplay=False)
            logger.info("✅ VoiceCoachTTS (M07) loaded successfully")
        except Exception as e:
            logger.warning(f"⚠️  VoiceCoachTTS (M07) initialization failed: {e}")
    return tts_coach

ws_router = APIRouter()

class ConnectionManager:
    """Manage active WebSocket connections."""
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"🔗 WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"🔌 WebSocket disconnected. Total connections: {len(self.active_connections)}")

manager = ConnectionManager()

async def generate_and_send_audio(websocket: WebSocket, phrase_key: str, lang_code: str = "en"):
    """
    Generate TTS audio and send to client asynchronously.
    Non-blocking: runs in thread pool to avoid blocking pose processing.
    """
    coach = get_tts_coach()
    if not coach:
        logger.debug("TTS coach not available, skipping audio")
        return
        
    try:
        # Run TTS generation in thread pool
        wav_bytes = await asyncio.to_thread(coach.get_audio_bytes, phrase_key, lang_code)
        b64_audio = base64.b64encode(wav_bytes).decode('utf-8')
        
        payload = {
            "event": "audio_stream",
            "data": {
                "phrase_key": phrase_key,
                "lang": lang_code,
                "audio_base64": b64_audio
            }
        }
        await websocket.send_json(payload)
        logger.debug(f"📢 Audio sent: {phrase_key} ({lang_code})")
    except Exception as e:
        logger.error(f"❌ TTS Streaming Error: {e}")

@ws_router.websocket("/ws/pose")
async def pose_websocket(websocket: WebSocket):
    """
    Main WebSocket endpoint for real-time pose streaming.
    Receives base64 frames, processes through ML pipeline, sends results back.
    """
    await manager.connect(websocket)
    session_context: dict = {"rep_count": 0, "session_id": "temp_uid"}
    frame_count = 0
    total_latency = 0
    start_session = time.time()
    
    logger.info("=" * 70)
    logger.info("🎥 WebSocket /ws/pose — New client connected")
    logger.info("=" * 70)

    try:
        while True:
            # ────────────────────────────────────────────────────────────────
            # RECEIVE FRAME FROM CLIENT
            # ────────────────────────────────────────────────────────────────
            try:
                data = await websocket.receive_text()
            except WebSocketDisconnect:
                logger.info("Client initiated disconnect")
                break
            except Exception as e:
                logger.error(f"❌ WebSocket receive error: {e}")
                break

            frame_count += 1
            
            # Log progress every 30 frames
            if frame_count % 30 == 1:
                elapsed_time = time.time() - start_session
                avg_latency = total_latency / max(frame_count - 1, 1)
                fps = frame_count / elapsed_time if elapsed_time > 0 else 0
                logger.info(f"📊 Progress - Frame: {frame_count} | FPS: {fps:.1f} | Avg Latency: {avg_latency:.0f}ms")

            # ────────────────────────────────────────────────────────────────
            # PARSE FRAME PAYLOAD
            # ────────────────────────────────────────────────────────────────
            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                logger.debug(f"Frame #{frame_count}: Invalid JSON, skipping")
                continue

            frame_str = payload.get("payload", "")
            if not frame_str:
                logger.debug(f"Frame #{frame_count}: Empty payload, skipping")
                continue

            if payload.get("session_id"):
                session_context["session_id"] = payload["session_id"]
            if payload.get("exercise_name"):
                session_context["exercise_name"] = payload["exercise_name"]
            if payload.get("primary_joint"):
                session_context["primary_joint"] = payload["primary_joint"]
            if payload.get("target_rom_min") is not None:
                session_context["target_rom_min"] = payload["target_rom_min"]
            if payload.get("target_rom_max") is not None:
                session_context["target_rom_max"] = payload["target_rom_max"]
            if payload.get("target_reps") is not None:
                session_context["target_reps"] = payload["target_reps"]

            # Update language code if provided
            if "lang" in payload:
                session_context["lang_code"] = payload["lang"]

            # ────────────────────────────────────────────────────────────────
            # PROCESS FRAME (Non-blocking)
            # ────────────────────────────────────────────────────────────────
            try:
                result = await asyncio.to_thread(
                    pipeline_instance.process_frame, frame_str, session_context
                )
                
                latency = result.get("metrics", {}).get("latency_ms", 0)
                total_latency += latency
                
            except Exception as e:
                logger.error(f"❌ Processing error on frame #{frame_count}: {e}")
                # Send safe error response to keep frontend alive
                await websocket.send_json({
                    "event": "inference_result",
                    "data": {
                        "landmarks_px": [],
                        "exercise": "Processing...",
                        "confidence": 0.0,
                        "rep_count": session_context.get("rep_count", 0),
                        "feedback": {
                            "status": "correct",
                            "color": "#00E5A0",
                            "message": "Recovering from processing error..."
                        },
                        "digital_twin": {
                            "predicted_rom": 0,
                            "fatigue_score": 0,
                            "target_angle": 90,
                            "deviation_score": 0
                        },
                        "cognitive_engagement": {
                            "cognitive_lstm": {"score": 85, "trend": "Baseline"},
                            "face_m12": {}
                        },
                        "form": {"is_correct": True, "anomaly_score": None},
                        "metrics": {"latency_ms": 0}
                    }
                })
                continue  # Skip to next frame without crashing

            # ────────────────────────────────────────────────────────────────
            # TRIGGER ASYNC TTS AUDIO (Fire-and-forget)
            # ────────────────────────────────────────────────────────────────
            audio_trigger = result.pop("audio_trigger", None)
            if audio_trigger:
                phrase = audio_trigger.get("phrase_key", "")
                lang = audio_trigger.get("lang", "en")
                asyncio.create_task(generate_and_send_audio(websocket, phrase, lang))

            # ────────────────────────────────────────────────────────────────
            # SEND INFERENCE RESULT TO FRONTEND
            # ────────────────────────────────────────────────────────────────
            try:
                await websocket.send_json({
                    "event": "inference_result",
                    "data": result
                })
            except Exception as e:
                logger.error(f"❌ Failed to send result to client: {e}")
                break

    except Exception as e:
        logger.critical(f"❌ FATAL WebSocket error: {e}", exc_info=True)
    finally:
        manager.disconnect(websocket)
        
        # Session summary
        session_duration = time.time() - start_session
        avg_latency = total_latency / max(frame_count, 1)
        fps = frame_count / session_duration if session_duration > 0 else 0
        
        logger.info("=" * 70)
        logger.info("📊 SESSION SUMMARY")
        logger.info(f"   Duration: {session_duration:.1f}s")
        logger.info(f"   Frames Processed: {frame_count}")
        logger.info(f"   Average FPS: {fps:.1f}")
        logger.info(f"   Average Latency: {avg_latency:.0f}ms")
        logger.info("=" * 70)
        
        try:
            await websocket.close()
        except Exception as e:
            logger.debug(f"WebSocket close error: {e}")
