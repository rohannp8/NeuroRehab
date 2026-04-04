from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging
import asyncio
import base64
import sys
import os

model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "model"))
if model_dir not in sys.path:
    sys.path.insert(0, model_dir)

from services.inference_pipeline import pipeline_instance

# Lazy load the TTS module provided in 06_tts_voice.py so we don't crash on boot if missing
tts_coach = None
def get_tts_coach():
    global tts_coach
    if tts_coach is None:
        try:
            m06 = __import__("06_tts_voice") 
            tts_coach = m06.VoiceCoachTTS(autoplay=False)
        except Exception as e:
            logging.error(f"Failed to initialize VoiceCoachTTS module: {e}")
    return tts_coach

logger = logging.getLogger(__name__)
ws_router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

manager = ConnectionManager()

async def generate_and_send_audio(websocket: WebSocket, phrase_key: str, lang_code: str = "en"):
    """
    Executes the heavy TTS Generation in an asyncio.to_thread worker.
    Yields the processed Base64 WAV blob asynchronously directly to the React frontend.
    """
    coach = get_tts_coach()
    if not coach:
        return
        
    try:
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
    except Exception as e:
        logger.error(f"TTS Streaming Error: {e}")

@ws_router.websocket("/ws/pose")
async def pose_websocket(websocket: WebSocket):
    await manager.connect(websocket)
    session_context = {"rep_count": 0, "session_id": "temp_uid"}
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            frame_str = payload.get("payload", "")
            
            # The client sets their chosen language code
            if "lang" in payload:
                session_context["lang_code"] = payload["lang"]
            
            # 1. Thread processes Inference frame within <100ms
            result = pipeline_instance.process_frame(frame_str, session_context)
            
            # 2. Async TTS Trigger
            # If the pipeline logic decides it's time to speak a correction
            audio_trigger = result.pop("audio_trigger", None)
            if audio_trigger:
                phrase = audio_trigger.get("phrase_key")
                lang = audio_trigger.get("lang", "en")
                asyncio.create_task(generate_and_send_audio(websocket, phrase, lang))
            
            # 3. Synchronous fast-frame JSON dispatch (Visual data bounding boxes, text feedback)
            await websocket.send_json({
                "event": "inference_result",
                "data": result
            })
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)
