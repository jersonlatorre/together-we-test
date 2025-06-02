@echo off

:: iniciar detector
cd detector
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt
start /B uvicorn server:app --host 0.0.0.0 --port 8000 --reload
cd ..

:: iniciar interacción
cd interaction
start /B npm run dev
cd ..

:: esperar a que el usuario presione Ctrl+C
pause 