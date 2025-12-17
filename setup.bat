@echo off
echo.
echo ========================================
echo   Smart Study Planner - Setup Script
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [1/4] Building and starting containers...
docker-compose up -d --build

echo.
echo [2/4] Waiting for Ollama to start (30 seconds)...
timeout /t 30 /nobreak >nul

echo.
echo [3/4] Pulling Llama 3.1 model (this may take 10-15 minutes on first run)...
echo      The model is approximately 4GB. Please be patient.
docker exec -it planner-ai ollama pull llama3.1

echo.
echo [4/4] Verifying services...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo   API Docs: http://localhost:5000/api/health
echo.
echo   To view logs: docker-compose logs -f
echo   To stop:      docker-compose down
echo.
pause
