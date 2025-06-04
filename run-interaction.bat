@echo off
setlocal

:: función para limpiar los procesos al cerrar
:cleanup
taskkill /F /PID %INTERACTION_PID% 2>nul
exit /b

:: capturar señales de terminación
set "INTERACTION_PID="

:: iniciar interacción
cd interaction
start /b npm run dev
set "INTERACTION_PID=%ERRORLEVEL%"
cd ..

:: esperar a que el usuario presione Ctrl+C
pause
call :cleanup 