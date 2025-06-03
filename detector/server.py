from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
from ultralytics import YOLO
import torch
from pydantic import BaseModel
from typing import List
import logging

# configurar logging
logging.getLogger("ultralytics").setLevel(logging.WARNING)
logging.getLogger("fastapi").setLevel(logging.WARNING)

app = FastAPI()

# configurar cors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# configuración del modelo
device = "mps" if torch.backends.mps.is_available() else "cpu"
model = YOLO("models/yolov8x-pose.pt")
model.to(device)
model.conf = 0.3
model.iou = 0.45
model.agnostic_nms = True
model.max_det = 10

# constantes
TARGET_WIDTH = 640
CONFIDENCE_THRESHOLD = 0.3

# inicializar el tracker
tracker = None


class Point(BaseModel):
    x: float
    y: float


class KeyPoint(BaseModel):
    x: float
    y: float
    confidence: float


class Skeleton(BaseModel):
    keypoints: List[KeyPoint]
    track_id: int  # añadimos el id de tracking


class PoseResponse(BaseModel):
    skeletons: List[Skeleton]
    width: int
    height: int


@app.post("/detect", response_model=PoseResponse)
async def detect_poses(file: UploadFile = File(...)):
    global tracker

    # leer imagen
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # obtener dimensiones originales
    height, width = frame.shape[:2]
    scale = TARGET_WIDTH / width
    new_height = int(height * scale)

    # redimensionar para procesamiento
    frame_resized = cv2.resize(frame, (TARGET_WIDTH, new_height))

    # detectar poses con tracking
    results = model.track(
        frame_resized,
        device=device,
        iou=0.45,
        conf=0.5,
        augment=False,
        max_det=30,
        verbose=False,
        persist=True,  # mantiene el tracking entre frames
    )

    # procesar resultados
    skeletons = []

    # Para cada persona detectada...
    if len(results) > 0 and results[0].keypoints is not None:
        for result in results:
            if result.keypoints is not None:
                for i, keypoints in enumerate(result.keypoints.data):
                    if len(keypoints) > 0:
                        keypoints_np = keypoints.cpu().numpy()
                        # Procesar keypoints
                        kps = []
                        for point in keypoints_np:
                            x = float(point[0] / TARGET_WIDTH)
                            y = float(point[1] / new_height)
                            confidence = float(point[2])
                            if point[0] < 5 or point[1] < 5:
                                confidence = 0.01
                            x = max(0.001, min(0.999, x))
                            y = max(0.001, min(0.999, y))
                            kps.append(KeyPoint(x=x, y=y, confidence=confidence))

                        # obtener el id de tracking
                        track_id = (
                            int(result.boxes.id[i].item())
                            if result.boxes.id is not None
                            else -1
                        )

                        # Agregar el esqueleto a la lista con su id de tracking
                        skeletons.append(Skeleton(keypoints=kps, track_id=track_id))

    # Devolver los esqueletos con sus ids de tracking
    return PoseResponse(skeletons=skeletons, width=TARGET_WIDTH, height=new_height)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
