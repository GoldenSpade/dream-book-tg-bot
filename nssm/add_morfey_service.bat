@echo off
setlocal

:: === НАСТРОЙКА ===
set NODE_PATH=C:\Program Files\nodejs\node.exe
set SCRIPT_PATH=C:\Bot\index.js
set WORKING_DIR=C:\Bot
set NSSM_PATH=C:\nssm
set SERVICE_NAME=MorfeyBot

:: === Проверка NSSM ===
if not exist "%NSSM_PATH%\nssm.exe" (
  echo ❌ NSSM не найден по пути: %NSSM_PATH%\nssm.exe
  pause
  exit /b
)

:: === Установка сервиса ===
echo ✅ Установка сервиса %SERVICE_NAME%...

"%NSSM_PATH%\nssm.exe" install %SERVICE_NAME% "%NODE_PATH%" "%SCRIPT_PATH%"
"%NSSM_PATH%\nssm.exe" set %SERVICE_NAME% AppDirectory "%WORKING_DIR%"
"%NSSM_PATH%\nssm.exe" set %SERVICE_NAME% AppStdout "%WORKING_DIR%\stdout.log"
"%NSSM_PATH%\nssm.exe" set %SERVICE_NAME% AppStderr "%WORKING_DIR%\stderr.log"
"%NSSM_PATH%\nssm.exe" set %SERVICE_NAME% Start SERVICE_AUTO_START

:: === Настройка автоперезапуска при сбоях ===
"%NSSM_PATH%\nssm.exe" set %SERVICE_NAME% AppRestartDelay 5000
"%NSSM_PATH%\nssm.exe" set %SERVICE_NAME% AppThrottle 0
"%NSSM_PATH%\nssm.exe" set %SERVICE_NAME% AppExit Default Restart

:: === Запуск сервиса ===
echo ▶️ Запуск сервиса %SERVICE_NAME%...
"%NSSM_PATH%\nssm.exe" start %SERVICE_NAME%

echo ✅ Сервис успешно установлен, настроен и запущен!
pause
