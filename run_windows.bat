@echo off
setlocal

echo ======================================
echo Festival Info System - Local Runner
echo Node.js + PostgreSQL (no Docker)
echo ======================================
echo.

REM Create .env if missing
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Created .env from .env.example.
  echo.
)

REM Check Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js not found. Install Node.js LTS first.
  pause
  exit /b 1
)

REM Ask for Postgres superuser password (used only for provisioning)
set "PGADMIN_USER=postgres"
set /p PGADMIN_PASSWORD=Enter PostgreSQL password for user postgres (needed to create DB/user): 

echo.
echo Installing dependencies...
call npm install
if errorlevel 1 (
  echo ERROR: npm install failed.
  pause
  exit /b 1
)

echo.
echo Initializing database (create role + db + schema)...
REM Pass PGADMIN_USER/PGADMIN_PASSWORD for this run
set "PGADMIN_USER=%PGADMIN_USER%"
set "PGADMIN_PASSWORD=%PGADMIN_PASSWORD%"
call npm run db:init
if errorlevel 1 (
  echo.
  echo ERROR: db:init failed.
  echo - Check that PostgreSQL is running.
  echo - Check the postgres password you entered.
  echo - If you have a different admin user, edit scripts/db_init.js env vars.
  pause
  exit /b 1
)

echo.
echo Seeding demo data...
call npm run db:seed
if errorlevel 1 (
  echo ERROR: db:seed failed.
  pause
  exit /b 1
)

echo.
echo Starting application...
call npm start

pause
