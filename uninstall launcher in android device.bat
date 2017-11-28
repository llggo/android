@echo off
set adb_path=%cd%\files\android\adb
SET PATH=%PATH%;%adb_path%

adb uninstall vn.miraway.lgo.launcher