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
	var binary = req("./binary");

    //服务器加壳
    var globalRes;
    var ServerBox = function (Req, Res) {
        globalRes = Res;
        try {
            Server(Req, Res);
        } catch (e) {
            console.log("Exceptional Server!");
            console.log(e.toString);
            e.stack && console.log(e.stack);
            Res.end();
        }
    };

    //服务器
    var Server = function (Req, Res) {
        if(Req.method=="OPTIONS" && Res.send){
            Res.send(200);
            return;
        }

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
        for(var path in binary.paths){
            if(uri.path.indexOf(path)==0){
                return binary.parse(Req, Res, binary.paths[path]);
            }
            if((uri.path + "/") == (path)){
                return binary.parse(Req, Res, binary.paths[path]);
            }
        }

        console.log(`route '${Req.url}' no found`);
        Res.end('{code:500}');
        /*不知道谁加的,先注掉
        if(uri.path.indexOf(db.path)==0){
            return db.parse(Req, Res);
        }*/
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
        exp.db = req("../db/mongo");
        exp.db.config = ops;
    };

    //启动
    exp.start = function () {
        var doStart = function(db){
            if(db){
                remoteServer.db = db;
            }
            var port = exp.port || 80;
            staticServer.init(exp);
            remoteServer.init();
            //binary.init(exp.config.binary);
            global.httpx = http.createServer(ServerBox).listen(port).on("error", Error);
            exp.startTip!="hide" && str.log("Node Is Running At {0}:{1} Or localhost:{1}", ex.getIp(), port);
        };
        exp.forever && process.on('uncaughtException', function (err) {
            //打印出错误
            console.log(err);
            //打印出错误的调用栈方便调试
            console.log(err.stack);
            globalRes && globalRes.end();
        });

        exp.db ? exp.db.init(doStart) : doStart();
    };

})(require, exports);
