@echo off
setlocal enabledelayedexpansion

:: función para limpiar los procesos al cerrar
:cleanup
    taskkill /F /PID !DETECTOR_PID! 2>nul
    taskkill /F /PID !INTERACTION_PID! 2>nul
    exit /b

:: iniciar detector
cd detector
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt
start /B uvicorn server:app --host 0.0.0.0 --port 8000 --reload
for /f "tokens=2" %%a in ('tasklist ^| findstr "uvicorn"') do set DETECTOR_PID=%%a
cd ..

:: iniciar interacción
cd interaction
start /B npm run dev
for /f "tokens=2" %%a in ('tasklist ^| findstr "node"') do set INTERACTION_PID=%%a
cd ..

:: esperar a que el usuario presione Ctrl+C
echo Presiona Ctrl+C para detener los servicios...
:wait
    timeout /t 1 >nul
    goto wait 