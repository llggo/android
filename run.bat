@echo off
set adb_path=%cd%\files\android\adb
SET PATH=%PATH%;%adb_path%

node app.js