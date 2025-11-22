@echo off 
 REM merge-all-claude.bat 
 REM Merge all origin/claude/* branches into main (Windows cmd script). 
 REM Usar en la raíz del repo clonado. Requiere Git en PATH y PowerShell disponible. 
 
 setlocal enabledelayedexpansion 
 
 set "TARGET=main" 
 set "REMOTE=origin" 
 set "ERR=0" 
 
 echo --- Preparando para mergear ramas %REMOTE%/claude/* en %TARGET% --- 
 
 REM 1) Comprobar Git 
 where git >nul 2>&1 
 if errorlevel 1 ( 
   echo ERROR: git no encontrado en PATH. Instalá Git for Windows o añadilo al PATH. 
   exit /b 10 
 ) 
 
 REM 2) Fetch remotos y limpieza 
 echo 1) git fetch --all --prune 
 git fetch --all --prune || (echo ERROR: git fetch falló & exit /b 11) 
 
 REM 3) Checkout y actualizar target 
 echo 2) Checkout %TARGET% 
 git checkout %TARGET% || (echo ERROR: no se pudo hacer checkout %TARGET% & exit /b 12) 
 echo 3) git pull %REMOTE% %TARGET% 
 git pull %REMOTE% %TARGET% || (echo ERROR: git pull falló & exit /b 13) 
 
 REM 4) Crear backup de main con timestamp 
 for /f "usebackq delims=" %%t in (`powershell -NoProfile -Command "Get-Date -Format 'yyyyMMddHHmmss'"`) do set "TS=%%t" 
 set "BACKUP=backup/%TARGET%-%TS%" 
 echo 4) Creando backup branch %BACKUP% 
 git branch "%BACKUP%" || (echo ERROR: no se pudo crear la rama de backup & exit /b 14) 
 
 REM 5) Buscar ramas remotas origin/claude/* 
 set "FOUND=0" 
 echo 5) Buscando ramas remotas %REMOTE%/claude/* 
 for /f "usebackq delims=" %%b in (`git for-each-ref --format="%%(refname:short)" refs/remotes/%REMOTE% ^| findstr /b "%REMOTE%/claude/"`) do ( 
   set "FOUND=1" 
   set "FULL=%%b" 
   REM quitar prefijo origin/ para mostrar nombre limpio 
   set "BRANCH=!FULL:%REMOTE%/=!" 
   echo. 
   echo ====================================================== 
   echo ==> Intentando mergear !BRANCH! (referencia remota: !FULL!) en %TARGET% 
   REM Merge desde la referencia remota 
   git merge --no-ff --no-edit "!FULL!" 
   if errorlevel 1 ( 
     echo. 
     echo !!!!! CONFLICTO al mergear !BRANCH! !!!!! 
     echo El script se detiene para que resuelvas el conflicto manualmente. 
     echo Pasos recomendados: 
     echo   1) git status 
     echo   2) Edita y resuelve los archivos en conflicto 
     echo   3) git add <archivos-resueltos> 
     echo   4) git commit    (completa el merge) 
     echo   5) git push %REMOTE% %TARGET% 
     echo Si queres continuar con las demás ramas luego de resolver, vuelve a ejecutar este .bat 
     pause 
     exit /b 2 
   ) else ( 
     echo Merge OK de !BRANCH! en %TARGET%. Ahora pusheando... 
     git push %REMOTE% %TARGET% || (echo ERROR: git push falló & exit /b 15) 
     echo Merge y push completados para !BRANCH!. 
   ) 
 ) 
 
 if "%FOUND%"=="0" ( 
   echo No se encontraron ramas remotas %REMOTE%/claude/*. Nada que mergear. 
   echo Terminando. 
   exit /b 0 
 ) 
 
 echo. 
 echo Todos los merges terminados (o se detuvo en el primer conflicto). 
 echo Backup de %TARGET% creado: %BACKUP% 
 endlocal 
 exit /b 0
