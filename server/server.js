/**
 * 服务器模块
 * Created by likaituan on 15/8/26.
 */

    var http = require("http");
    var https = require("https");

    var route = require("./route");
	var staticServer = require("./staticServer");
	var remoteServer = require("./remoteServer");
    var binary = require("./binary");
    var mongodb = require("../db/mongodb");
    var ops;

    //服务器加壳
    var globalRes;
    var ServerBox = function (req, res) {
        globalRes = res;
        try {
            Server(req, res);
        } catch (e) {
            console.log("Exceptional Server!");
            console.log(e.toString);
            e.stack && console.log(e.stack);
            res.end();
        }
    };

    //服务器
    var Server = function (req, res) {
        if(req.method=="OPTIONS" && res.send){
            res.send(200);
            return;
        }

        var [server, item] = route.parse(req,[remoteServer, binary, staticServer]);
        if(server){
            server.parse(req, res, item);
        }else{
            console.log(`route '${req.url}' no found`);
            Res.end('{code:500}');
        }

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

    var Forever = function(){
        process.on('uncaughtException', function (err) {
            //打印出错误
            console.log(err);
            //打印出错误的调用栈方便调试
            console.log(err.stack);
            globalRes && globalRes.end();
        });
    };

    //启动
    var Start = function(db){
        if(db){
            remoteServer.db = db;
        }
        var port = ops.port || 80;
        staticServer.init(ops);
        remoteServer.init(ops.remote, ops.db);
        //binary.init(ops.binary);
        var httpx = port==443 ? https : http;
        global.httpx = httpx.createServer(ServerBox).listen(port).on("error", Error);
        ops.startTip!="hide" && console.log(`Node Is Running At ${ops.env.ip}:${port} Or localhost:${port}`);
        ops.open && cp.execSync(`open http://localhost:${server.port}`);
    };

    //初始化
    exports.init = function(_ops){
        ops = _ops;
        ops.forever && Forever();

        if(ops.db){
            mongodb.config = ops.db;
            mongodb.init(Start);
        }else{
            Start();
        }
    };
