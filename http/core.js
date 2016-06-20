/**
 * 服务器模块
 * Created by likaituan on 15/8/26.
 */

(function(req, exp) {
    "use strict";
    var http = req("http");
	var url = req("url");
	var fs = req("fs");

	var str = req("../core/string");
	var ex = req("../core/ex");

	var params = req("./params");
	var staticServer = req("./staticServer");
	var remoteServer = req("./remoteServer");
    var db = req("../db/mongo");

    //服务器
    var Server = function (Req, Res) {
        var resJson = {};
        resJson["Content-Type"] = "text/html;charset=utf-8";
        if(exp.crossDomain){
            resJson["Access-Control-Allow-Origin"] = exp.crossDomain;
            resJson["Access-Control-Allow-Headers"] = "userId,sessionId";//"X-Custom-Header";//"X-Requested-With";
            resJson["Access-Control-Allow-Methods"] = "GET,POST";//"PUT,POST,GET,DELETE,OPTIONS";
        }
        if(Req.method=="OPTIONS" && Res.send){
            Res.send(200);
            return;
        }
        Res.writeHead(200,resJson);
        console.log("resJson=",resJson);

		var uri = url.parse(Req.url);
        for(var path in remoteServer.paths){
            if(uri.path.indexOf(path)==0){
                return remoteServer.parse(Req, Res,remoteServer.paths[path]);
            }
        }
        for(var path in staticServer.paths){
            if(uri.path.indexOf(path)==0){
                return staticServer.parse(Req, Res,staticServer.paths[path]);
            }
            if((uri.path + "/") == (path)){
                return staticServer.parse(Req, Res,staticServer.paths[path]);
            }
        }
        if(uri.path.indexOf(db.path)==0){
            return db.parse(Req, Res);
        }
    };

    //报错处理
    var Error = function(err){
        console.log(err);
        err && err.stack && console.log(err.stack);
    };

    //添加静态服务
    exp.addStatic = function(ops) {
        staticServer.paths[ops.path] = ops;
    };

    //添加远程服务
    exp.addRemote = function(ops) {
        remoteServer.paths[ops.path] = ops;
    };

    //添加远程服务
    exp.addDb = function(ops) {
        db.config = ops;
    };

    //启动
    exp.start = function () {
        var doStart = function(){
            var port = exp.port || 80;
            staticServer.init();
            remoteServer.init();
            http.createServer(Server).listen(port).on("error", Error);
            exp.startTip!="hide" && str.log("Node Is Running At {0}:{1} Or localhost:{1}", ex.getIp(), port);
        };
        db.config.dbName ? db.init(doStart) : doStart();
    };

})(require, exports);
