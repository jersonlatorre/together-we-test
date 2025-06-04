@echo off
setlocal

:: función para limpiar los procesos al cerrar
:cleanup
taskkill /F /PID %DETECTOR_PID% 2>nul
exit /b

:: capturar señales de terminación
set "DETECTOR_PID="

:: iniciar detector
cd detector
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt
start /b uvicorn server:app --host 0.0.0.0 --port 8000 --reload
set "DETECTOR_PID=%ERRORLEVEL%"
cd ..

:: esperar a que el usuario presione Ctrl+C
pause
call :cleanup 