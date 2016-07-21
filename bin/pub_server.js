#!/usr/bin/env node

var fs = require("fs");
var cmd = require("./cmd");

    var port = "$1";
    var dir = "$2";

    console.log("port=",port,"dir=",dir);

    cmd.start();

    //step1 - stop node
    var pid = cmd.sync("pid=`ps -aux | grep nobox | grep start | grep port=$port | awk '{print $2}'`");
    pid && cmd (`kill - 9 ${pid}`);

    cmd(`cd ${dir}`);

    //step2 - delete old files
    fs.syncExists("bin/") && cmd("rm - rf bin/");

    //step3 - add new files
    cmd("mkdir bin");
    cmd("tar -zxf bin.tar.gz -C bin/");

    cmd("cd bin/");

    //step4 - run node
    var noboxExeFile = cmd.sync("npm bin -g") + "/nobox";
    cmd(`nohup node ${noboxExeFile} start bin port=$port > 1.log 2>&1 &`);

    cmd.end();