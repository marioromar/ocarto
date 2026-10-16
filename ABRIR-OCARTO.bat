@echo off
title Ocarto - Iniciar editor local
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor-ocarto.ps1"
if errorlevel 1 (
  echo.
  echo No se pudo iniciar Ocarto. Comprueba que el puerto 8787 no este ocupado.
  pause
)