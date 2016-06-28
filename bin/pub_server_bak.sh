#! /bin/bash

currentPath=`dirname $0`
cd $currentPath

if [ -d bin/ ]; then
	rm -rf bin/
fi

mkdir bin
tar -zxf bin.tar.gz -C bin/

port="$1"
pid=`ps -aux | grep nobox | grep start | grep port=$port | awk '{print $2}'`

if [ "$pid" ]; then
	kill $pid
fi

cd bin/
nohup nobox start bin port=$port > 1.log 2>&1 &
