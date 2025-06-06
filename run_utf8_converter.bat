@echo off
echo Installing required dependencies...
pip install -r requirements.txt

echo.
echo Running UTF-8 encoding script...
python apply_utf8_encoding.py

echo.
echo Press any key to exit...
pause
