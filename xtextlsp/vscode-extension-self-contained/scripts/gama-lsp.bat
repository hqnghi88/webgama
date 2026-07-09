@echo off
setLocal EnableDelayedExpansion

set "memory="
set "args="

:TOP
IF (%1) == () GOTO NEXT_CODE
if %1 EQU -m (
    set memory=%2
    SHIFT
) else (
    set args=%args% %1
)
SHIFT
GOTO TOP

:NEXT_CODE
set "FILENAME=..\plugins\"
FOR /F %%e in ('dir /b %FILENAME%') do (
    SET result=%%e
    if "!result:~0,29!" == "org.eclipse.equinox.launcher_" (
        goto END
    )
)
:END
set "result=..\plugins\%result%"

set "ini_arguments="
set "skip_until_line=-server"
set "skipping=true"

for /f "usebackq delims=" %%a in (..\Gama.ini) do (
    set "line=%%a"
    if !skipping!==true (
        if !skip_until_line!==%%a (
            set "skipping=false"
            set "ini_arguments=!ini_arguments!!line! "
        )
    ) else (
        if "!line:~0,4!"=="-Xmx" (
            if "!memory!"=="" ( set "memory=!line:~4!" )
        ) else (
            set "ini_arguments=!ini_arguments!!line! "
        )
    )
)

if "%memory%"=="" set "memory=4096m"

set "pathWorkspace=.workspace-lsp"
if not exist "%pathWorkspace%" mkdir "%pathWorkspace%"

if exist ..\jdk\ (
    call ..\jdk\bin\java -cp "%result%" -Xms512m -Xmx%memory% !ini_arguments! -Djava.awt.headless=true org.eclipse.equinox.launcher.Main -configuration ./configuration -application gama.lsp.lspapplication -data "%pathWorkspace%" %args%
) else (
    call "%JAVA_HOME%\bin\java.exe" -cp "%result%" -Xms512m -Xmx%memory% !ini_arguments! -Djava.awt.headless=true org.eclipse.equinox.launcher.Main -configuration ./configuration -application gama.lsp.lspapplication -data "%pathWorkspace%" %args%
)
