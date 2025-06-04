#!/bin/bash

# función para limpiar los procesos al cerrar
cleanup() {
    kill $INTERACTION_PID
    exit
}

# capturar señales de terminación
trap cleanup SIGINT SIGTERM

# iniciar interacción
cd interaction
npm run dev &
INTERACTION_PID=$!
cd ..

# esperar a que el usuario presione Ctrl+C
wait 