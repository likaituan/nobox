#!/usr/bin/env node

var ex = require("./ex");
var package = require("../package.json");

var argv = process.argv.slice(2);
var cmd = /^\-/.test(argv[0]) ? "" : argv.shift();
var args = ex.getArgs(argv);
args.cmd = cmd;


var ops = {};
ops.package = package;
ops.currentPath = process.cwd() + "/";
ops.sudo = process.platform=="win32" ? "" : "sudo ";
ops.inpm = process.platform=="win32" ? "npm.cmd" : "npm";


var cmdList = require("./cmdList");             //命令列表
cmdList.start = require("./start");             //启动
cmdList.pub = require("./pub");                 //发版
cmdList.pub_server = require("./pub_server");   //服务端发版


//查看版本
if(args.v || args.version){
    console.log(package.version);
//命令
}else if(cmdList[cmd]){
    cmdList[cmd](args, ops);
//错误命令
}else if(cmd) {
    console.log(`unknown command "${cmd}"!`);
//默认
}else{
    console.log(`welcome to ${package.name}, ${package.name} current version is ${package.version}!`);
}