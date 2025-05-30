from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
from ultralytics import YOLO
import torch
from pydantic import BaseModel
from typing import List, Dict, Tuple
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
model = YOLO("models/yolo11l-pose.pt")
model.to(device)
model.conf = 0.3
model.iou = 0.45
model.agnostic_nms = True
model.max_det = 10

# constantes
TARGET_WIDTH = 640
CONFIDENCE_THRESHOLD = 0.3


class Point(BaseModel):
    x: float
    y: float


class Line(BaseModel):
    start: Point
    end: Point
    confidence: float


class PoseResponse(BaseModel):
    lines: List[Line]
    width: int
    height: int
    heads: List[Point]  # <-- NUEVO CAMPO


@app.post("/detect", response_model=PoseResponse)
async def detect_poses(file: UploadFile = File(...)):
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

    # detectar poses
    results = model(
        frame_resized,
        device=device,
        iou=0.45,
        conf=0.5,
        augment=False,
        max_det=30,
        verbose=False,
    )

    # procesar resultados y generar líneas directamente
    lines = []

    # Conexiones semánticas personalizadas
    # Indices COCO: 0-nariz, 5-hombro i, 6-hombro d, 7-codo i, 8-codo d, 9-muñeca i, 10-muñeca d, 11-cadera i, 12-cadera d, 13-rodilla i, 14-rodilla d, 15-tobillo i, 16-tobillo d
    # Calcularemos dos puntos virtuales: nuca y estómago
    # Conexiones: cabeza-nuca, nuca-hombro i, nuca-hombro d, nuca-estómago, estómago-cadera i, estómago-cadera d, hombro i-codo i, codo i-muñeca i, hombro d-codo d, codo d-muñeca d, cadera i-rodilla i, rodilla i-tobillo i, cadera d-rodilla d, rodilla d-tobillo d
    semantic_connections = []
    # Los índices COCO relevantes
    HEAD = 0
    SHOULDER_L = 5
    SHOULDER_R = 6
    ELBOW_L = 7
    ELBOW_R = 8
    WRIST_L = 9
    WRIST_R = 10
    HIP_L = 11
    HIP_R = 12
    KNEE_L = 13
    KNEE_R = 14
    ANKLE_L = 15
    ANKLE_R = 16
    # Para cada persona detectada...
    if len(results) > 0 and results[0].keypoints is not None:
        for result in results:
            if result.keypoints is not None:
                for keypoints in result.keypoints.data:
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
                            kps.append({'x': x, 'y': y, 'confidence': confidence})
                        # Calcular punto virtual: nuca
                        if kps[SHOULDER_L]['confidence'] > CONFIDENCE_THRESHOLD and kps[SHOULDER_R]['confidence'] > CONFIDENCE_THRESHOLD:
                            nuca_x = (kps[SHOULDER_L]['x'] + kps[SHOULDER_R]['x']) / 2
                            nuca_y = (kps[SHOULDER_L]['y'] + kps[SHOULDER_R]['y']) / 2
                            # Opcional: desplazar un poco hacia la cabeza
                            if kps[HEAD]['confidence'] > CONFIDENCE_THRESHOLD:
                                nuca_y = nuca_y * 0.8 + kps[HEAD]['y'] * 0.2
                            nuca_conf = min(kps[SHOULDER_L]['confidence'], kps[SHOULDER_R]['confidence'])
                        else:
                            nuca_x, nuca_y, nuca_conf = 0, 0, 0
                        # Calcular punto virtual: estómago
                        if kps[HIP_L]['confidence'] > CONFIDENCE_THRESHOLD and kps[HIP_R]['confidence'] > CONFIDENCE_THRESHOLD:
                            stomach_x = (kps[HIP_L]['x'] + kps[HIP_R]['x']) / 2
                            stomach_y = (kps[HIP_L]['y'] + kps[HIP_R]['y']) / 2
                            # Opcional: desplazar un poco hacia la nuca
                            stomach_y = stomach_y * 0.8 + nuca_y * 0.2
                            stomach_conf = min(kps[HIP_L]['confidence'], kps[HIP_R]['confidence'])
                        else:
                            stomach_x, stomach_y, stomach_conf = 0, 0, 0
                        # Conexiones semánticas
                        def add_line(p1, p2, conf):
                            if conf > CONFIDENCE_THRESHOLD:
                                semantic_connections.append(Line(start=Point(x=p1[0], y=p1[1]), end=Point(x=p2[0], y=p2[1]), confidence=conf))
                        # cabeza-nuca
                        add_line((kps[HEAD]['x'], kps[HEAD]['y']), (nuca_x, nuca_y), min(kps[HEAD]['confidence'], nuca_conf))
                        # nuca-hombro i
                        add_line((nuca_x, nuca_y), (kps[SHOULDER_L]['x'], kps[SHOULDER_L]['y']), min(nuca_conf, kps[SHOULDER_L]['confidence']))
                        # nuca-hombro d
                        add_line((nuca_x, nuca_y), (kps[SHOULDER_R]['x'], kps[SHOULDER_R]['y']), min(nuca_conf, kps[SHOULDER_R]['confidence']))
                        # nuca-estómago
                        add_line((nuca_x, nuca_y), (stomach_x, stomach_y), min(nuca_conf, stomach_conf))
                        # estómago-cadera i
                        add_line((stomach_x, stomach_y), (kps[HIP_L]['x'], kps[HIP_L]['y']), min(stomach_conf, kps[HIP_L]['confidence']))
                        # estómago-cadera d
                        add_line((stomach_x, stomach_y), (kps[HIP_R]['x'], kps[HIP_R]['y']), min(stomach_conf, kps[HIP_R]['confidence']))
                        # hombro i-codo i
                        add_line((kps[SHOULDER_L]['x'], kps[SHOULDER_L]['y']), (kps[ELBOW_L]['x'], kps[ELBOW_L]['y']), min(kps[SHOULDER_L]['confidence'], kps[ELBOW_L]['confidence']))
                        # codo i-muñeca i
                        add_line((kps[ELBOW_L]['x'], kps[ELBOW_L]['y']), (kps[WRIST_L]['x'], kps[WRIST_L]['y']), min(kps[ELBOW_L]['confidence'], kps[WRIST_L]['confidence']))
                        # hombro d-codo d
                        add_line((kps[SHOULDER_R]['x'], kps[SHOULDER_R]['y']), (kps[ELBOW_R]['x'], kps[ELBOW_R]['y']), min(kps[SHOULDER_R]['confidence'], kps[ELBOW_R]['confidence']))
                        # codo d-muñeca d
                        add_line((kps[ELBOW_R]['x'], kps[ELBOW_R]['y']), (kps[WRIST_R]['x'], kps[WRIST_R]['y']), min(kps[ELBOW_R]['confidence'], kps[WRIST_R]['confidence']))
                        # cadera i-rodilla i
                        add_line((kps[HIP_L]['x'], kps[HIP_L]['y']), (kps[KNEE_L]['x'], kps[KNEE_L]['y']), min(kps[HIP_L]['confidence'], kps[KNEE_L]['confidence']))
                        # rodilla i-tobillo i
                        add_line((kps[KNEE_L]['x'], kps[KNEE_L]['y']), (kps[ANKLE_L]['x'], kps[ANKLE_L]['y']), min(kps[KNEE_L]['confidence'], kps[ANKLE_L]['confidence']))
                        # cadera d-rodilla d
                        add_line((kps[HIP_R]['x'], kps[HIP_R]['y']), (kps[KNEE_R]['x'], kps[KNEE_R]['y']), min(kps[HIP_R]['confidence'], kps[KNEE_R]['confidence']))
                        # rodilla d-tobillo d
                        add_line((kps[KNEE_R]['x'], kps[KNEE_R]['y']), (kps[ANKLE_R]['x'], kps[ANKLE_R]['y']), min(kps[KNEE_R]['confidence'], kps[ANKLE_R]['confidence']))
    lines = semantic_connections

    # Extraer posiciones de las cabezas
    heads = []
    if len(results) > 0 and results[0].keypoints is not None:
        for result in results:
            if result.keypoints is not None:
                for keypoints in result.keypoints.data:
                    if len(keypoints) > 0:
                        keypoints_np = keypoints.cpu().numpy()
                        kps = []
                        for point in keypoints_np:
                            x = float(point[0] / TARGET_WIDTH)
                            y = float(point[1] / new_height)
                            confidence = float(point[2])
                            if point[0] < 5 or point[1] < 5:
                                confidence = 0.01
                            x = max(0.001, min(0.999, x))
                            y = max(0.001, min(0.999, y))
                            kps.append({'x': x, 'y': y, 'confidence': confidence})
                        # HEAD = 0 (ya está definido arriba)
                        if kps[HEAD]['confidence'] > CONFIDENCE_THRESHOLD:
                            heads.append(Point(x=kps[HEAD]['x'], y=kps[HEAD]['y']))

    # Devolver las líneas procesadas y las cabezas
    return PoseResponse(
        lines=lines,
        width=TARGET_WIDTH,
        height=new_height,
        heads=heads
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
