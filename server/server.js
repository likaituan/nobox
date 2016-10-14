/**
 * 服务器模块
 * Created by likaituan on 15/8/26.
 */

var http = require("http");
var https = require("https");
var util = require("util");

var route = require("./route");
var staticServer = require("./staticServer");
var remoteServer = require("./remoteServer");
var binary = require("./binary");
var mongodb = require("../db/mongodb");
var {cmd,log} = require("ifun");
var ops;

var globalRes;
//报错处理
var Error = function(err){
    if(console && console.log){
        console.log(err);
        //err && err.stack && console.log(err.stack);
    }
    if(globalRes) {
        globalRes.writeHead(500, {"Content-Type": "text/plain;charset=utf-8"});
        globalRes.end();
    }
};

//成功输出
var resSuccess = function(rs){
    if(rs===undefined){
        rs = {};
    }
    if(util.isPrimitive(rs)){
        rs = {message:rs};
    }
    rs.code = 0;
    rs.success = true;
    rs = JSON.stringify(rs);
    this.end(rs);
};

//失败输出
var resFail = function(rs){
    if(rs===undefined){
        rs = {};
    }
    if(util.isPrimitive(rs)){
        rs = {message:rs};
    }
    rs.code = -3;
    rs.sucesss = false;
    rs = JSON.stringify(rs);
    this.end(rs);
};

//服务器
var Server = function (req, res) {
    //log(req.url);
    res.success = resSuccess;
    res.fail = resFail;
    globalRes = res;
    if(req.method=="OPTIONS" && res.send){
        res.send(200);
        return;
    }

    //相对路径过滤
    if(/\/\.+\//.test(req.url)){
        res.writeHead(404, {"Content-Type": "text/plain;charset=utf-8"});
        res.end("illegal path!");
        return;
    }

    //目前只能用post
    if(ops.routes && ops.routes[req.url]){
        req.crossDomain = ops.crossDomain;
        ops.routes[req.url](req, res);
        return;
    }

    var [server, item] = route.parse(req,[remoteServer, binary, staticServer]);
    if(server){
        server.parse(req, res, item);
    }else{
        console.log(`route '${req.url}' no found`);
        res.end('{code:500}');
    }
};

//启动
var Start = function(db){
    if(db){
        remoteServer.db = db;
    }
    var port = ops.args.port || ops.port || 80;
    staticServer.init(ops);
    remoteServer.init(ops.remote, ops.db);
    //binary.init(ops.binary);
    var httpx = port==443 ? https : http;
    global.httpx = httpx.createServer(Server).listen(port).on("error", Error);
    ops.startTip!="hide" && console.log(`Node Is Running At ${ops.ua.ip}:${port} Or localhost:${port}`);
    ops.open && cmd(`open http://localhost:${ops.port}`);
};

//初始化
exports.init = function(_ops){
    ops = _ops;
    process.on('uncaughtException', Error);//进程错误处理, 保证服务器不挂

    if(ops.db){
        mongodb.config = ops.db;
        mongodb.init(Start);
    }else{
        Start();
    }
};