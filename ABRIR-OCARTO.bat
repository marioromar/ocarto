@echo off
title Ocarto - Iniciar editor local
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor-ocarto.ps1"
if errorlevel 1 (
  echo.
  echo No se pudo iniciar Ocarto.
  echo Si ya hay un Ocarto abierto, prueba con http://127.0.0.1:8787/
  pause
)