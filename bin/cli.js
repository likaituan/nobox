#!/usr/bin/env node

var path = require("path");
var ex = require("./ex");
var coreEx = require("../core/ex");
var {name,version} = require("../package.json");

var argv = process.argv.slice(2);
var cmd = /^\-/.test(argv[0]) ? "" : argv.shift();
var args = ex.getArgs(argv);
args.cmd = cmd;
args.path = path.resolve(args.path||"./");

var ops = {};
ops.engine = {name,version};
ops.currentPath = process.cwd() + "/";
ops.user = process.env.USER;
ops.ip = args.ip || coreEx.getIp();
ops.sudo = process.platform!="win32"&&ops.user!="root" ? "sudo " : "";
ops.npm = process.platform=="win32" ? "npm.cmd" : "npm";


var cmdList = require("./cmdList");             //命令列表
cmdList.start = require("./start");             //启动
cmdList.pub = require("./pub");                 //发版
cmdList.pub_server = require("./pub_server");   //服务端发版


//查看版本
if(args.v || args.version){
    console.log(pk.version);
//命令
}else if(cmdList[cmd]){
    cmdList[cmd](args, ops);
//错误命令
}else if(cmd) {
    console.log(`unknown command "${cmd}"!`);
//默认
}else{
    console.log(`welcome to ${ops.engine.name}, ${ops.engine.name} current version is ${ops.engine.version}!`);
}