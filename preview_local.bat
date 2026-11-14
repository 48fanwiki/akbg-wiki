@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [1/2] 正在构建静态页面与 Pagefind 中文搜索索引...
mkdocs build --clean
if errorlevel 1 (
  echo.
  echo 构建失败，请检查上方报错信息。
  pause
  exit /b 1
)
echo.
echo [2/2] 构建完成！正在启动本地预览服务器：http://127.0.0.1:8000
echo 按 Ctrl+C 可停止服务器。
echo.
start "" "http://127.0.0.1:8000"
python -m http.server 8000 -d site
