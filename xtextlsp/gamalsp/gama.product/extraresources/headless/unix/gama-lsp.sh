#!/bin/bash

if [[ "$OSTYPE" == "darwin"* ]]; then
    headlessPath=$( dirname "${BASH_SOURCE[0]}" )
    gamaIniPath="${headlessPath}/../Eclipse/Gama.ini"
    pluginPath="${headlessPath}/../Eclipse/plugins"
else
    headlessPath=$( dirname $( realpath "${BASH_SOURCE[0]}" ) )
    gamaIniPath="${headlessPath}/../Gama.ini"
    pluginPath="${headlessPath}/../plugins"
fi

java="java"

if [ -d "${headlessPath}/../jdk" ]; then
  java="${headlessPath}"/../jdk/
    [[ "$OSTYPE" == "darwin"* ]] && java+="Contents/Home/"
    java+="bin/java"
else
  javaVersion=$(java -version 2>&1 | head -n 1 | cut -d "\"" -f 2)
  if [[ ${javaVersion:2} == 21 ]]; then
    echo "You should use Java 21 to run GAMA LSP"
    echo "Found you using version : $javaVersion"
    exit 1
  fi
fi

memory="0"
args=""

while [[ "$#" -gt 0 ]]; do
    case "$1" in
        -m)
            memory="$2"
            shift 2
            ;;
        *)
            args+="$1 "
            shift
            ;;
    esac
done

if [[ $memory == "0" ]]; then
  memory=$(grep Xmx "${gamaIniPath}" || echo "-Xmx4096m")
else
  memory=-Xmx$memory
fi

function read_from_ini {
  start_line=$(grep -n -- '-server' "${gamaIniPath}" | cut -d ':' -f 1)
  tail -n +$start_line "${gamaIniPath}" | tr '\n' ' '
}

ini_arguments=$(read_from_ini)

pathWorkspace="${headlessPath}/.workspace-lsp"
mkdir -p "$pathWorkspace"

if [[ -z "$args" ]]; then
    args+="-help"
fi

exec $java -cp "${pluginPath}"/org.eclipse.equinox.launcher*.jar \
        -Xms512m \
        $memory \
        ${ini_arguments[@]} \
        org.eclipse.equinox.launcher.Main \
        -configuration "${headlessPath}"/configuration \
        -application gama.lsp.lspapplication \
        -data "$pathWorkspace" \
        $args
