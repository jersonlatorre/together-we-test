#!/bin/bash

# función para limpiar los procesos al cerrar
cleanup() {
    kill $DETECTOR_PID
    exit
}

# capturar señales de terminación
trap cleanup SIGINT SIGTERM

# iniciar detector
cd detector
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000 --reload &
DETECTOR_PID=$!
cd ..

# esperar a que el usuario presione Ctrl+C
wait 