#! /bin/bash

user="$1"
ip="$2"
port="$3"
dir="$4"

ssh $user@$ip "sh \`npm root -g\`/nobox/bin/pub_server.sh $port $dir"