#! /bin/bash

tarFile="$1"
tarSource="$2"
user="$3"
ip="$4"
port="$5"
dir="$6"

echo "tarFile=$tarFile"
echo "tarSource=$tarSource"
echo "user=$user"
echo "ip=$ip"
echo "port=$port"
echo "dir=$dir"

if [ -f "$tarFile" ]; then
    rm "$tarFile"
fi
echo `tar -zcf "$tarFile" "$tarSource"`
echo "pack success!"

scp "$tarFile" $user@$ip:$dir/bin.tar.gz
echo "upload success!"

ssh $user@$ip "sh $dir/pub.sh $port"
echo "publish success!"
