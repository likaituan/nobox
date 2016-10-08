#!/usr/bin/env node

var path = require("path");
var {getArgs,log} = require("ifun");
var {getIp} = require("../core/ex");
var {name,version} = require("../package.json");

var argv = process.argv.slice(2);
var cmd = /^\-/.test(argv[0]) ? "" : argv.shift();
var args = getArgs(argv);
args.cmd = cmd;
args.path = path.resolve(args.path||"./");

var ua = {};
ua.engine = {name,version};
ua.currentPath = process.cwd() + "/";
ua.user = process.env.USER;
ua.ip = args.ip || getIp();
ua.sudo = process.platform!="win32"&&ua.user!="root" ? "sudo " : "";
ua.npm = process.platform=="win32" ? "npm.cmd" : "npm";


var cmdList = require("./cmdList");             //命令列表
cmdList.start = require("./start");             //启动
cmdList.pub = require("./pub");                 //发版
cmdList.deploy = require("./deploy");           //服务端部署


//查看版本
if(args.v || args.version){
    log(version);
//命令
}else if(cmdList[cmd]){
    cmdList[cmd](args, ua);
//错误命令
}else if(cmd) {
    log(`unknown command "${cmd}"!`);
//默认
}else{
    log(`welcome to ${ua.engine.name}, ${ua.engine.name} current version is ${ua.engine.version}!`);
}