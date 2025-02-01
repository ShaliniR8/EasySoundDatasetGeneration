import os
import shutil
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from python_helpers.dataset_functions import validate_csv, dataset_feature_extraction
from python_helpers.parler_tts.load_model import (
    generate_audio,
    chop_audio,
    modify_pitch,
    modify_speed,
    reset_audio as reset_audio_func,
    TTSModel,
)
from cachetools import TTLCache

UPLOAD_FOLDER = "extracted"
API_DIRECTORY = os.path.dirname(os.path.realpath(__file__))


class RequestPayload(BaseModel):
    text: Optional[str] = None
    name_of_model: Optional[str] = None
    start: Optional[float] = None
    end: Optional[float] = None
    speed_factor: Optional[float] = None
    pitch_factor: Optional[float] = None


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

TTS_MODELS = TTLCache(maxsize=10, ttl=3600)
TTS_MODEL = None
PITCH = 0
SPEED = 1


@app.get("/api/v1/model")
async def load_model(folder_name: str):
    global TTS_MODEL
    folder_path = f"./models/{folder_name}"
    if folder_name in TTS_MODELS:
        TTS_MODEL = TTS_MODELS[folder_name]
        return {"message": f"TTS Model for '{folder_name}' is already loaded."}
    TTS_MODEL = TTSModel(folder_path=folder_path)
    TTS_MODELS[folder_name] = TTS_MODEL
    return {"message": f"TTS Model for '{folder_name}' loaded and cached successfully."}


@app.post("/api/v1/generate")
async def generate(payload: RequestPayload):
    global PITCH, SPEED
    text = payload.text
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")
    if TTS_MODEL is None:
        raise HTTPException(
            status_code=400, detail="No TTS model loaded. Please load a model first."
        )
    try:
        generate_audio(text, TTS_MODEL)
        PITCH = 0
        SPEED = 1
        return {"message": "Audio generated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/audio")
async def get_audio():
    file_path = "tts.wav"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(file_path, media_type="audio/wav")


@app.post("/api/v1/chop")
async def chop(request: RequestPayload):
    start = request.start
    end = request.end
    if start is None or end is None or start >= end:
        raise HTTPException(status_code=400, detail="Invalid start or end time")
    audio_path = "tts.wav"
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="No audio file found")
    try:
        return chop_audio(start, end, audio_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/speed")
async def speed(websocket: WebSocket):
    global SPEED
    await websocket.accept()
    try:
        data = await websocket.receive_json()
        speed_factor = data.get("speed_factor")
        if speed_factor is None:
            await websocket.send_json({"type": "error", "message": "speed_factor not provided"})
            return
        if (SPEED + speed_factor) > 0:
            SPEED += speed_factor
            print(SPEED)
            await modify_speed("tts_cropped.wav", "tts.wav", SPEED, websocket)
        else:
            await websocket.send_json({"type": "status", "status": "success", "message": f"Speed is {SPEED}"})
    except WebSocketDisconnect:
        pass


@app.websocket("/ws/pitch")
async def websocket_pitch(websocket: WebSocket):
    global PITCH
    await websocket.accept()
    try:
        data = await websocket.receive_json()
        pitch_factor = data.get("pitch_factor")
        if pitch_factor is None:
            await websocket.send_json({"type": "error", "message": "pitch_factor not provided"})
            return
        PITCH += pitch_factor
        await modify_pitch("tts_cropped.wav", "tts.wav", PITCH, websocket)
    except WebSocketDisconnect:
        pass


@app.post("/api/v1/reset_audio")
async def reset_audio_endpoint():
    destination_audio_path = "tts.wav"
    target_audio_path = "tts_backup.wav"
    return reset_audio_func(target_audio_path, destination_audio_path)


@app.post("/api/v1/keep")
async def keep_text(request: RequestPayload):
    if not request.text or not request.name_of_model:
        raise HTTPException(status_code=400, detail="Text and model name are required")
    text = request.text.strip()
    name_of_model = request.name_of_model.strip()
    if not text:
        raise HTTPException(status_code=400, detail="No text provided.")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{name_of_model}_{timestamp}.wav"
    wavs_dir = ".tmp/wavs"
    metadata_file = f".tmp/{name_of_model}_metadata.csv"
    source_wav = "tts.wav"
    if not os.path.exists(source_wav):
        raise HTTPException(status_code=500, detail="No sound file found to keep.")
    os.makedirs(wavs_dir, exist_ok=True)
    dest_wav = os.path.join(wavs_dir, filename)
    try:
        shutil.copyfile(source_wav, dest_wav)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Error moving file: {str(e)}")
    entry = f"{filename}|{text}\n"
    try:
        with open(metadata_file, "a", encoding="utf-8") as f:
            f.write(entry)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Error writing metadata: {str(e)}")
    return {"status": "success", "filename": filename, "text": text}


@app.post("/api/v1/datasets/validate_csv")
async def validate():
    response, status_code = validate_csv(UPLOAD_FOLDER, API_DIRECTORY)
    return JSONResponse(content=response, status_code=status_code)


@app.websocket("/ws/feature_extraction")
async def websocket_feature_extraction(websocket: WebSocket):
    await websocket.accept()
    try:
        await dataset_feature_extraction(websocket)
        await websocket.send_json({"type": "status", "status": "success", "message": "Feature Extraction completed"})
    except WebSocketDisconnect:
        pass


@app.get("/api/v1/home")
async def home():
    return {"message": "Backend is running."}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        await websocket.send_json({"Message": "Test TEst Test"})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5000, reload=True)
