#!/bin/bash

JAVA_XML_OPTS="-Djdk.xml.maxGeneralEntitySizeLimit=0 -Djdk.xml.totalEntitySizeLimit=0 -Djdk.xml.entityExpansionLimit=0 -Djdk.xml.entityReplacementLimit=0"

echo "Compiling gama.annotations"
cd $( dirname $( realpath "${BASH_SOURCE[0]}" ) )/../gama.annotations
mvn ${JAVA_XML_OPTS} clean install "$@"

echo "Compiling gama.processor"
cd ../gama.processor 
mvn ${JAVA_XML_OPTS} clean install "$@"

echo "Compiling gama.parent"
cd ../gama.parent 
mvn ${JAVA_XML_OPTS} clean install "$@"
