import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

# Transitioned from Flask to FastAPI due to FastAPI's async architecture.
# FastAPI - improved performance, built-in data validation, (TODO) automatic documentation generation.

from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from python_helpers.dataset_functions import validate_csv, dataset_feature_extraction
from python_helpers.parler_tts.load_model import generate_audio, TTSModel
from cachetools import TTLCache

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = 'extracted'
FLASK_DIRECTORY = os.path.dirname(os.path.realpath(__file__))
# TTS_MODELS = TTLCache(maxsize=10, ttl=3600) 
TTS_MODEL = None
AUDIO_FILE_PATH = None

@app.get("/api/v1/model")
async def set_model(folder_name: str): 
    TTS_MODEL = TTSModel(folder_name=f"./models/{folder_name}")
    return {"message": "Set TTS Model Successfully."}

# class ChopRequest(BaseModel):
#     start: float
#     end: float

# @app.post("/api/v1/generate")
# async def generate(text):
#     if not text:
#         raise HTTPException(status_code=400, detail="No text provided")
#     try:
#         generate_audio(text, TTS_MODEL)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
#     return {"message": "Audio generated successfully", "audio_url": "/get_audio"}

# @app.get("/get_audio")
# async def get_audio():
#     if not os.path.exists("parler_tts/" + audio_file_path):
#         raise HTTPException(status_code=404, detail="Audio file not found")
#     return FileResponse("parler_tts/" + audio_file_path, media_type="audio/wav")

# @app.post("/chop")
# async def chop_audio(request: ChopRequest):
#     if not os.path.exists("parler_tts/" + audio_file_path):
#         raise HTTPException(status_code=404, detail="No audio file found")
#     try:
#         audio, samplerate = sf.read("parler_tts/" + audio_file_path)
#         start_sample = int(request.start * samplerate)
#         end_sample = int(request.end * samplerate)
#         if request.start >= request.end:
#             raise HTTPException(status_code=400, detail="Invalid start or end time")
#         chopped_audio = audio[start_sample:end_sample]
#         sf.write("parler_tts/" + audio_file_path, chopped_audio, samplerate)
#         return {"message": "Audio chopped successfully"}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/accept")
# async def accept(text: str):
#     if not text:
#         raise HTTPException(status_code=400, detail="No text provided")
#     if not os.path.exists("parler_tts/" + audio_file_path):
#         raise HTTPException(status_code=404, detail="No audio file found. Generate one first.")
#     reinforce_folder = "reinforce"
#     os.makedirs(reinforce_folder, exist_ok=True)
#     existing_files = [f for f in os.listdir(reinforce_folder) if f.endswith(".wav")]
#     next_file_number = len(existing_files) + 1
#     new_file_path = os.path.join(reinforce_folder, f"sr_{next_file_number}.wav")
#     os.rename("parler_tts/" + audio_file_path, new_file_path)
#     with open("reinforce.txt", "a") as reinforce_file:
#         reinforce_file.write(f"\n{new_file_path}|{text}")
#     return {"message": f"Audio file saved as {new_file_path}"}

@app.post("/api/v1/datasets/validate_csv")
async def validate():
    response, status_code = validate_csv(UPLOAD_FOLDER, FLASK_DIRECTORY)
    return JSONResponse(content=response, status_code=status_code)

@app.websocket("/ws/feature_extraction")
async def websocket_endpoint(websocket: WebSocket):
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
async def websocket_endpoint(websocket: WebSocket):
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
    uvicorn.run(app, host="0.0.0.0", port=5000, reload=True)