#!/usr/bin/env node

var os = require("os");
var cp = require("child_process");

var ex = require("./ex");
var pk = require("../package.json");

var argv = process.argv.slice(2);
var cmd = /^\-/.test(argv[0]) ? "" : argv.shift();
var args = ex.getArgs(argv);
args.cmd = cmd;

var ops = {};
ops.platform = os.platform;
ops.package = {
    name: pk.name,
    version: pk.version
};
ops.currentPath = process.cwd() + "/";

//模块列表
var modList = {
    start: require("./start"),              //启动
    pub: require("./pub"),                  //发版
    pub_server: require("./pub_server")     //服务端发版
};

//命令列表
var cmdList = {
    //更新
    install: function(args, ops){
        console.log("now is reinstall, please wait a moment...");
        var installCmd = (ops.platform=="win32"?"":"sudo ") + `npm install -g ${ops.package.name}`;
        cp.exec(installCmd, function callback(error, stdout, stderr) {
            console.log(stdout);
        });
    },
    //更新
    update: function(args, ops){
        console.log("now is updating, please wait a moment...");
        var updateCmd = ops.platform=="win32" ? `npm update -g ${ops.package.name}` : `sudo npm update -g ${ops.package.name}`;
        cp.exec(updateCmd, function callback(error, stdout, stderr) {
            console.log(stdout);
        });
    }
};

//查看版本
if(args.v || args.version){
    console.log(ops.package.version);
//模块
}else if(modList[cmd]){
    modList[cmd](args, ops);
//命令
}else if(cmdList[cmd]){
    cmdList[cmd](args, ops);
//错误命令
}else if(cmd) {
    console.log("unknown command!");
//默认
}else{
    console.log(`welcome to ${ops.package.name}, ${ops.package.name} current version is ${ops.package.version}!`);
}