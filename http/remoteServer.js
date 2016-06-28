/**
 * 远程动态服务器
 * Created by likaituan on 15/8/26.
 */

~function(req, exp) {
    "use strict";
	var fs = req("fs");
	var qs = req("querystring");
	var http = req("http");

    var _params = req("./params");

	var ex = req("../core/ex");
    var str = req("../core/string");
    var date = req("../core/date");
    var val = req("../validate/validate");

    exp.paths = {};
    exp.serviceList = {};

    //初始化
    exp.init = function () {
        for(var path in exp.paths) {
            var item = exp.paths[path];
            if(item.validate){
                if(!item.validate.rule) {
                    item.validate = {rule: item.validate};
                }
                if(item.validate.lang) {
                    val.tip = val.tips[item.validate.lang];
                }
            }else{
                item.validate = {};
            }
            if (item.dir) {
                var o = exp.serviceList[path] = {};
                fs.readdirSync(item.dir).forEach(function(fileName){
                    var key = fileName.split(".")[0];
                    o[key] = require(item.dir + key);
                });
            } else if (item.file) {
                exp.serviceList[path] = item.file;
            }
        }

	};

    //报错处理
    var Error = function(err){
        console.log(err);
        err.code == "EADDRINUSE" && console.log("服务器地址及端口已被占用");
        err && err.stack && console.log(err.stack);
    };

	//转发远程
    exp.parse = function (Req, Res, item) {
        var resJson = {};
        resJson["Content-Type"] = "text/html;charset=utf-8";
        if(item.crossDomain){
            resJson["Access-Control-Allow-Origin"] = item.crossDomain;
            resJson["Access-Control-Allow-Headers"] = "userId,sessionId";//"X-Custom-Header";//"X-Requested-With";
            resJson["Access-Control-Allow-Methods"] = "GET,POST";//"PUT,POST,GET,DELETE,OPTIONS";
        }
        Res.writeHead(200,resJson);

        var re = new RegExp("^"+item.path,"i");
        var url = Req.url.replace(re, "").split("/");
        var serviceList = exp.serviceList[item.path];
        var file = item.dir ? url.shift() : null;
		var method = url.join("/");
        (function () {
			var fun;
			if(item.dir){
				fun = serviceList[file];
				if(typeof(fun)!="object"){
					console.log("service [ "+file+" ] 文件不存在");
					Res.end('{"code":500}');
					return;
				}
				fun = fun[method];
			}else if(item.file){
				fun = serviceList[method];
			}
            if(typeof(fun)!="function"){
                console.log("service [ "+method+" ] 方法不存在");
                Res.end('{"code":500}');
                return;
            }
            _params.getParams(Req, Res, function (srcParams) {
                //空格过滤
                var params = {};
                for(var k in srcParams) {
                    params[k] = typeof(srcParams[k])=="string" ? srcParams[k].trim() : srcParams[k];
                }
                //console.log(Req.headers);
                exp.session = {};
                (item.headerKeys||[]).forEach(function(key){
                    var v = Req.headers[key.toLowerCase()];
                    exp.session[key] = v=="undefined" ? undefined : v;
                });
                var ops = fun(params, exp.session);
                if(typeof(ops)=="object" && ops.url) {
                    ops.url = str.format(ops.url, params); //地址栏格式化
                    //抛出表单检查的bug
                    try {
                        if(item.dataKeys){
                            //item.dataKeys.forEach( key => params[key]=exp.session[key] );
                            item.dataKeys.forEach(function(key){
                                ops.data[key] = exp.session[key];
                            });
                        }
                        exp.chkForm(params, ops.chk, Res, item) && exp.send(ops, item, Req, Res);
                        //exp.send(ops, item, Req, Res);
                    } catch (e) {
                        Error(e);
                        console.log("未知的异常错误");
                        Res.end('{"code":500}');
                    }
                }else{
					/*
					if(typeof(ops)=="object"){
						Res.end(JSON.stringify(ops));
					}else{
						Res.end(ops);
					}
					*/
					Res.end(JSON.stringify({
						success: true,
						code:0,
						data: ops
					}));
                }
            });
        })();
    };

    //表单检查
    exp.chkForm = function (params, chk_params, Res, item) {
        var msg = val.chk(params, chk_params, item.validate.rule);
        if (msg === true) {
            if (params.hasOwnProperty("is_submit") && params.is_submit == 0) {
                Res.end('{"code":0}');
                return false;
            }
        } else {
            Res.end(JSON.stringify({code: -3, message: (item.validate.prefix||"") + msg + (item.validate.suffix||"") }));
            return false;
        }
        return true;
    };

    //转发请求
    exp.send = function (ops, item, Req, Res) {

        var contentType = item.contentType || "x-www-form-urlencoded";
        var uriData = qs.stringify(ops.data);
        var jsonData = JSON.stringify(ops.data);
        var data = contentType=="json" ? jsonData : uriData;
        var PATH = (item.prefix||"") + ops.url;

        var url = {
            host: item.host,
            port: item.port,
            path: PATH,
            method: ops.type,
            headers: {
                //"Cookie": Req.headers.cookie || "",
                "Content-Type": "application/"+contentType+"; charset=UTF-8"
                //,"Content-Length": data.replace(/[^\x00-\xff]/g,"aa").length
                //,"Content-Length": data.length
            }
        };
        for(var key in exp.session){
            url.headers[key] = exp.session[key] || "";
        }

        if (ops.type.toLowerCase() == "get") {
            //url = "http://" + url.host + ":" + url.port + url.path;
            url.path += "?" + uriData;
            data = "";
            url.headers["Content-Length"] = 0;
        }
        console.log("\n=============== Service Info ================");
        console.log("TIME: "+date.now());
        console.log("TYPE: " + ops.type);
        console.log("URL: " + url.host+":"+url.port);
        console.log("PATH: " + PATH);
        console.log("DATA: " + data.replace(/(password\w*=)\w+/ig,"$1******"));
        var req = http.request(url, function (res) {
            console.log('STATUS: ' + res.statusCode);
            var body = "";
            res.on('data', function (chunk) {
                body += chunk;
            }).on("end", function () {
                exp.parseResult(body,Res,item,ops);
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
        //req.write(data);
        req.write(data + "\n");
        req.end();
    };

    //处理返回结果
    exp.parseResult = function (body,Res,item,ops) {
        var jsonObj = {};
        try {
            jsonObj = JSON.parse(body);
            console.log("RESULT: "+JSON.stringify(jsonObj,null,4));
        } catch (e) {
            console.log("RESULT: "+body);
            Res.end('{"code":500}');
            return;
        }
        if(item.getResult){
            jsonObj = item.getResult(jsonObj);
        }
        if(ops.res){
            jsonObj = ops.res(jsonObj);
        }
        var jsonStr = JSON.stringify(jsonObj);
        Res.end(jsonStr);
    };



}(require, exports);
