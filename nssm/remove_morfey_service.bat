@echo off
setlocal

:: Путь к NSSM
set NSSM_PATH=C:\nssm

:: Название сервиса
set SERVICE_NAME=MorfeyBot

:: Проверка наличия NSSM
if not exist "%NSSM_PATH%\nssm.exe" (
  echo ❌ NSSM не найден по пути: %NSSM_PATH%\nssm.exe
  pause
  exit /b
)

:: Удаление сервиса
echo ❗ Удаление сервиса %SERVICE_NAME%...
"%NSSM_PATH%\nssm.exe" remove %SERVICE_NAME% confirm

echo ✅ Сервис %SERVICE_NAME% успешно удалён!
pause
