# Transitioned from Flask to FastAPI due to FastAPI's async architecture.
# FastAPI - improved performance, built-in data validation, (TODO) automatic documentation generation.
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Body
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from python_helpers.dataset_functions import validate_csv, dataset_feature_extraction
from python_helpers.parler_tts.load_model import generate_audio, chop_audio, TTSModel
from cachetools import TTLCache

class RequestPayload(BaseModel):
    text: Optional[str] = None
    start: Optional[float] = None
    end: Optional[float] = None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = 'extracted'
API_DIRECTORY = os.path.dirname(os.path.realpath(__file__))
TTS_MODELS = TTLCache(maxsize=10, ttl=3600) 
TTS_MODEL = None
AUDIO_FILE_PATH = None

@app.get("/api/v1/model")
async def load_model(folder_name: str):
    global TTS_MODEL
    folder_path = f"./models/{folder_name}"
    if folder_name in TTS_MODELS:
        # If the model is already cached, just set it as current TTS_MODEL.
        TTS_MODEL = TTS_MODELS[folder_name]
        return {"message": f"TTS Model for '{folder_name}' is already loaded."}
    else:
        # Load and cache the new TTS model.
        TTS_MODEL = TTSModel(folder_path=folder_path)
        TTS_MODELS[folder_name] = TTS_MODEL
        return {"message": f"TTS Model for '{folder_name}' loaded and cached successfully."}


@app.post("/api/v1/generate")
async def generate(payload: RequestPayload):
    text = payload.text
    print(f"Received text: {text}")
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    if TTS_MODEL is None:
        raise HTTPException(status_code=400, detail="No TTS model loaded. Please load a model first.")

    try:
        generate_audio(text, TTS_MODEL)
        return {"message": "Audio generated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/v1/audio")
async def get_audio():
    file_path = "tts.wav"
    return FileResponse(file_path, media_type="audio/wav")
    
@app.post("/chop")
async def chop(request: RequestPayload):
    start = request.start
    end = request.end
    if start is None or end is None or start >= end:
        raise HTTPException(status_code=400, detail="Invalid start or end time")
    
    audio_path = 'vox_fabrik_front/public/tts.wav'
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="No audio file found")

    try:
       return chop_audio(start, end, audio_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/v1/datasets/validate_csv")
async def validate():
    response, status_code = validate_csv(UPLOAD_FOLDER, API_DIRECTORY)
    return JSONResponse(content=response, status_code=status_code)


@app.websocket("/ws/feature_extraction")
async def websocket_feature_extraction(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_json({"message": "Connection established"})
    try:
        await dataset_feature_extraction(websocket)
    except WebSocketDisconnect:
        print("WebSocket disconnected")


@app.get("/api/v1/home")
async def home():
    return {"message": "Backend is running."}


@app.websocket("/ws")
async def websocket_root(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_json({"message": "Connection established"})
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        print("WebSocket disconnected")


if __name__ == "__main__":
    import uvicorn
    # uvicorn vox_fabrik:app --host=0.0.0.0 --port=5000 --reload
    uvicorn.run(app, host="0.0.0.0", port=5000, reload=True)
