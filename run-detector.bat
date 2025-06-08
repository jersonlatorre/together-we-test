@echo off

cd detector
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000 --reload