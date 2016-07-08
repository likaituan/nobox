#! /bin/bash

port="$1"
dir="$2"

#step1 - stop node

pid=`ps -aux | grep nobox | grep start | grep port=$port | awk '{print $2}'`
if [ "$pid" ]; then
	kill $pid
fi

cd $dir

#step2 - delete old files

if [ -d bin/ ]; then
	rm -rf bin/
fi

#step3 - add new files

mkdir bin
tar -zxf bin.tar.gz -C bin/


#step4 - run node

cd bin/
noboxExeFile=`npm bin -g`/nobox
nohup node $noboxExeFile start bin port=$port > 1.log 2>&1 &
