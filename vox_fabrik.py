import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

# Transitioned from Flask to FastAPI due to FastAPI's async architecture.
# FastAPI - improved performance, built-in data validation, (TODO) automatic documentation generation.

from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from python_helpers.dataset_functions import validate_csv, dataset_feature_extraction
from python_helpers.parler_tts.load_model import generate_audio, TTSModel

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