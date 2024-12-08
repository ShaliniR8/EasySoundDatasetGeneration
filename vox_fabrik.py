# Transitioned from Flask to FastAPI due to FastAPI's async architecture.
# FastAPI - improved performance, built-in data validation, (TODO) automatic documentation generation.
import os, shutil
from datetime import datetime
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
    model_name: Optional[str] = None
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
    
@app.post("/api/v1/chop")
async def chop(request: RequestPayload):
    start = request.start
    end = request.end
    if start is None or end is None or start >= end:
        raise HTTPException(status_code=400, detail="Invalid start or end time")
    
    audio_path = 'tts.wav'
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="No audio file found")

    try:
       return chop_audio(start, end, audio_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/keep")
def keep_text(request: RequestPayload):
    text = request.text.strip()
    model_name = request.model_name.strip()
    if not text:
        raise HTTPException(status_code=400, detail="No text provided.")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{model_name}_{timestamp}.wav"

    wavs_dir = ".tmp/wavs"
    metadata_file = f".tmp/{model_name}_metadata.csv"
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

# WOrk on this later
# @app.post('/api/v1/discard_all')
# async def discard_all(request: RequestPayload):
#     model_name = request.model_name.strip()
#     wavs_dir = ".tmp/wavs"
#     metadata_file = f".tmp/{model_name}_metadata.csv"

#     if os.path.exists(wavs_dir) and os.path.isdir(wavs_dir):
#         for file_name in os.listdir(wavs_dir):
#             if file_name.endswith(".wav") and file_name.startswith(model_name):
#                 file_path = os.path.join(wavs_dir, file_name)
#                 try:
#                     os.remove(file_path)
#                     print(f"Deleted: {file_path}")
#                 except Exception as e:
#                     print(f"Failed to delete {file_path}: {e}")
#     else:
#         print(f"The folder '{wavs_dir}' does not exist.")

#     if os.path.exists(metadata_file):
#         try:
#             with open(metadata_file, "w") as file:
#                 file.write("") 
#             print(f"Cleared content of {metadata_file}")
#         except Exception as e:
#             print(f"Failed to clear {metadata_file}: {e}")
#     else:
#         print(f"The file '{metadata_file}' does not exist.")

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
