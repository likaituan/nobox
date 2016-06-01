/**
 * 服务器模块
 * Created by likaituan on 15/8/26.
 */

(function(require, exp) {
    "use strict";
    var fs = require("fs");
    var http = require("http");
    var qs = require("querystring");
    var ex = require("./ex");
    var extList = require("./mime");
    var str = require("./string");
    var date = require("./date");

    var env = require("./ENV");
    var val = require("./validate");
    var rules = require("../java/validate_rules");
    var tp = require("./template");

    var countHTML = fs.readFileSync("node/count.html");

    exp.staticPath = "";
    exp.servicePath = "";
    exp.serviceList = null;

    //服务器
    var Server = function (req, res) {
        exp.route(req, res);
    };

    //报错处理
    var Error = function(err){
        console.log(err);
        err && err.stack && console.log(err.stack);
    };

    //启动
    exp.start = function (port) {
        http.createServer(Server).listen(port).on("error", Error);
        str.log("Node Is Running At {0}:{1} Or localhost:{1}", ex.getIp(), port);
        str.log("Java Is Running At {0}:{1}", env.ip, env.port);
    };

    //获取service列表
    exp.getService = function (callback) {
        if (this.serviceList) {
            return callback(this.serviceList);
        }
        exp.serviceList = {};
        fs.readdir(exp.servicePath, function (err, data) {
            data.forEach(function (fileName) {
                if (fileName != "validate_fields.js") {
                    var key = fileName.split(".")[0];
                    exp.serviceList[key] = require("../" + exp.servicePath + key);
                }
            });
            callback(exp.serviceList);
        });
    };

    //路由
    exp.route = function (req, res) {
        res.writeHead(200, {"Content-Type": "text/html;charset=utf-8"});

        if (exp.servicePath && /^\/service\//.test(req.url)) {
            exp.service(req, res);
        }
        else if(exp.countPath && req.url.indexOf(exp.countPath)==1) {
            exp.countService(req, res);
        }
        else if (exp.staticPath) {
            exp.static(req, res);
        }
    };

    //统计服务器
    exp.countService = function(req, res) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(countHTML);
    };

    //service服务器
    exp.service = function (req, res) {
        var url = req.url.replace(/^\//, "");
        url = url.split("/");
        url.shift();
        var file = url.shift();
        var method = url.join("/");
        exp.getService(function (serviceList) {
            //console.log(serviceList);
            //console.log(file,method);
            var fun = serviceList[file];
            if(typeof(fun)!="object"){
                console.log("service [ "+file+" ] 文件不存在");
                res.end('{"code":500}');
                return;
            }
            fun = fun[method];
            if(typeof(fun)!="function"){
                console.log("service [ "+method+" ] 方法不存在");
                res.end('{"code":500}');
                return;
            }
            ex.getParams(req, function (params) {
                //空格过滤
                for(var k in params) {
                    params[k] = typeof(params[k])=="string" ? params[k].trim() : params[k];
                }
                //console.log(req.headers);
                var session = {
                    userId: req.headers.userid,
                    cellphone: req.headers.cellphone
                };
                var ops = fun(params, session);
                //抛出表单检查的bug
                try {
                    exp.chkForm(params, ops.chk, res) && exp.send(ops, req, res);
                }catch(e){
                    Error(e);
                    console.log("未知的异常错误");
                    res.end('{"code":500}');
                }
            });
        });
    };

    //静态服务器
    //未做缓存
    exp.static = function (req, res) {
        var file = req.url.replace(/^\//, "").replace(/\?.*$/, "");
        if (file == "") {
            file = "index.html";
        }
        var ext = file.split(".")[1] || "txt";
        ext = extList[ext] || "text/plain";
        var bm = /^image\//.test(ext) ? 'binary' : 'utf-8';
        //console.log(exp.staticPath+file);
        //console.log(bm);
        fs.readFile(exp.staticPath + file, bm, function (err, data) {
            if (err) {
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.end("file is not found!");
            } else {
                res.writeHead(200, {'Content-Type': ext});
                if(file=="index.html"){
                    data = tp.compile(data)({bin:process.env.bin||0});
                }
                res.write(data, bm);
                res.end();
            }
        });
    };


    //获取过滤后的参数
    var getParams = function (params, chkItems) {
        if(params.ignoreParams){
            var ignoreArr = params.ignoreParams.split(",");
            var newData = {};
            for(var key in chkItems) {
                if (key!="ignoreParams" && ignoreArr.indexOf(key) == -1) {
                    newData[key] = chkItems[key];
                }
            }
            return newData;
        }
        return chkItems;
    };

    //表单检查
    exp.chkForm = function (params, chkItems, res) {
        chkItems = getParams(params, chkItems);
        var msg = val.chk(params, chkItems, rules);
        if (msg === true) {
            if (params.hasOwnProperty("is_submit") && params.is_submit == 0) {
                res.end('{"code":0}');
                return false;
            }
        } else {
            res.end(JSON.stringify({code: -3, message: "亲, " + msg}));
            return false;
        }
        return true;
    };

    //转发请求
    exp.send = function (ops, Req, Res) {
        var data = qs.stringify(ops.data);
        var url = {
            host: env.ip,
            port: env.port,
            path: env.path + ops.url,
            method: ops.type,
            headers: {
                "sessionId": Req.headers.sessionid,
                "Content-Type": 'application/x-www-form-urlencoded; charset=UTF-8',
                "Content-Length": data.length
            }
        };

        if (ops.type == "get") {
            //url = "http://" + url.host + ":" + url.port + url.path;
            url.path += "?" + data;
        }
        console.log("\n=============== Service Info ================");
        console.log("TIME: "+date.now());
        console.log("TYPE: " + ops.type);
        console.log("URL: " + ops.url);
        console.log("DATA: " + data.replace(/(password\w*=)\w+/ig,"$1******"));
        //console.log(url);
        var req = http.request(url, function (res) {
            console.log('STATUS: ' + res.statusCode);
            //console.log('HEADERS: ' + JSON.stringify(res.headers));
            var body = "";
            res.on('data', function (chunk) {
                //console.log('BODY: ' + chunk);
                body += chunk;
            }).on("end", function () {
                exp.parseResult(body, Res, ops);
            }).on('error', function (e) {
                Res.end(JSON.stringify({code: res.statusCode, msg: e.message}));
            });
        });
        req.on('error', function (err) {
            if(err.code=="ECONNREFUSED"){
                console.log("连接JAVA被拒绝.........");
            }else{
                console.log("远程服务器出错, 错误代码是: "+err.code+".................");
            }
            Res.end('{"code":500}');
        });
        req.write(data + "\n");
        req.end();
    };

    //处理返回结果
    exp.parseResult = function (body, Res, ops) {
        var json = {};
        try {
            json = JSON.parse(body);
            console.log("RESULT: "+JSON.stringify(json,null,4));
        } catch (e) {
            console.log("RESULT: "+body);
            Res.end('{"code":500}');
            return;
        }
        var bodyJson = {};
        if (json.responseCode !== undefined) {
            bodyJson.code = json.responseCode;
        }
        if (json.responseData !== undefined) {
            bodyJson.data = json.responseData;
        }
        if (json.responseMessage !== undefined) {
            bodyJson.message = json.responseMessage;
        }
        ops.res && ops.res(bodyJson);
        Res.end(JSON.stringify(bodyJson));
    };

})(require, exports);
