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
    var pk = require("../package.json");
    var str = req("../core/string");
    var date = req("../core/date");
    var val = req("../validate/validate");
    var util = req("util");
    var {getClientIp} = require("ifun");
    var log = console.log;
    
    exp.items = {};
    exp.serviceList = {};

    //初始化
    exp.init = function (config, db) {
        config = config || {};
        config.items = config.items || [config];
        if(db){
            db.type = "mongodb";
            config.items.push(db);
        }
        config.items.forEach(function (item) {
            for (var k in config) {
                if (k !== "items" && item[k] === undefined) {
                    item[k] = config[k];
                }
            }
            if(item.path) {
                exp.items[item.path] = item;
            }
        });

        //添加到映射表
        for(var p in exp.items) {
            var item = exp.items[p];
            if(item.validate){
                if(!item.validate.rule) {
                    item.validate = {rule: item.validate};
                }
                if(item.validate.lang) {
                    if(item.validate.langFile){
                        val.tip = item.validate.langFile;
                    }else {
                        val.tip = val.tips[item.validate.lang];
                    }
                }
            }else{
                item.validate = {};
            }

            if (item.dir) {
                var o = exp.serviceList[p] = {};
                fs.readdirSync(item.dir).forEach(function(fileName){
                    var key = fileName.split(".")[0];
                    o[key] = require(item.dir + key);
                });
            } else if (item.file) {
                exp.serviceList[p] = item.file;
            }
        }
	};

    //报错处理
    var Error = function(err){
        log(err);
        err.code == "EADDRINUSE" && log("服务器地址及端口已被占用");
        err && err.stack && log(err.stack);
    };

	//转发远程
    exp.parse = function (Req, Res, item) {
        var resJson = {};
        resJson["Content-Type"] = "text/html;charset=utf-8";
        resJson["Server"] = `${pk.name}/${pk.version}`;
        if(item.crossDomain){
            resJson["Access-Control-Allow-Origin"] = item.crossDomain;
            resJson["Access-Control-Allow-Credentials"] = false;
            //resJson["Access-Control-Allow-Headers"] = "userId,sessionId";//"X-Custom-Header";//"X-Requested-With";
            resJson["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
            if(item.headerKeys){
                resJson["Access-Control-Allow-Headers"] += "," + item.headerKeys.join(",");
            }
            resJson["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS";//"PUT,POST,GET,DELETE,OPTIONS";
        }
        Res.writeHead(200,resJson);
        if(Req.method=="OPTIONS"){
            //log("send=",Res.send);
            //Res.send(200);
            //global.httpx.abort();
            Res.end();
            //Res.end('{"code":-99,"message":"取不到数据"}');
            return;
        }

        var re = new RegExp("^"+item.path,"i");
        //var url = Req.url.replace(re, "").split("/");
        var url = Req.url.replace(re, "").replace(/\?.*$/,"").split("/");
        var serviceList = exp.serviceList[item.path];
        var file = item.dir ? url.shift() : null;
		var method = url.join("/");
        (function () {
			var fun;
			if(item.dir){
				fun = serviceList[file];
				if(typeof(fun)!="object"){
					log("service [ "+file+" ] 文件不存在");
					Res.end('{"code":500}');
					return;
				}
				fun = fun[method];
			}else if(item.file){
				fun = serviceList[method];
			}
            if(typeof(fun)!="function"){
                log("service [ "+method+" ] 方法不存在");
                Res.end('{"code":500}');
                return;
            }
            _params.getParams(Req, Res, item, function (srcParams) {
                //空格过滤
                var params = {};
                if(item.type=="bin"){
                    params = srcParams;
                }else {
                    for (var k in srcParams) {
                        params[k] = typeof(srcParams[k]) == "string" ? srcParams[k].trim() : srcParams[k];
                    }
                }
                //log(Req.headers);
                exp.session = {};
                (item.headerKeys||[]).forEach(function(key){
                    var v = Req.headers[key.toLowerCase()];
                    exp.session[key] = v=="undefined" ? undefined : v;
                });
                exp.session.ip = exp.session.ip || getClientIp(Req);
                if(item.type=="binary"){
                    fun({
                        params: params,
                        session: exp.session
                    }, function(data){
                        var stream = data.stream || data.filename && fs.createReadStream(data.filename);
                        if(stream) {
                            var headJson = {
                                "Content-Type": "application/octet-stream;charset=utf-8"
                            };
                            if(data.filename){
                                var suffix = /\.\w+$/.test(data.filename) && RegExp.lastMatch || "";
                                headJson["Content-Disposition"] = `attachment;filename=${Date.now()}${suffix}`;
                            }
                            Res.writeHead(200, headJson);

                            stream.pipe(Res);
                        }else{
                            Res.writeHead(404, {"Content-Type": "text/plain;charset=utf-8"});
                            Res.end();
                        }
                    });
                    return;
                }

                var ops = fun(params, exp.session);

                if(item.type=="json") {
                    Res.end(JSON.stringify({
                        success: true,
                        code: 0,
                        data: ops
                    }));
                }else{
                    if(item.dataKeys){
                        item.dataKeys.forEach(function(key){
                            ops.data[key] = exp.session[key];
                        });
                    }
                    var isPass = exp.chkForm(params, ops.chk, Res, item);
                    if(isPass){
                        if(item.type=="mongodb"){
                            if(!exp.db){
                                log("you not install mongodb!");
                                Res.end(`{"code":500}`);
                                return;
                            }
                            var doRet = function(ret){
                                ret.code = ret.code || 0;
                                Res.end(JSON.stringify({
                                    success: ret.code==0,
                                    code: ret.code,
                                    data: ret.data || {},
                                    message: ret.message || ""
                                }));
                            };
                            var doAction = function(){
                                if(ops.action && ops.table && ops.data) {
                                    exp.db[ops.action](ops.table, ops.data, doRet);
                                }else{
                                    doRet({code:0});
                                }
                            };
                            if(ops.onBefore){
                                ops.onBefore(exp.db, function(ret){
                                    ret ? doRet(ret) : doAction();
                                })
                            }else {
                                doAction();
                            }
                        }else {
                            if(util.isFunction(ops)) {
                                ops(Req, Res);
                            }else if(util.isFunction(ops.callback)){
                                ops.callback(Req, Res);
                            }else {
                                ops.url = str.format(ops.url, params); //地址栏格式化
                                exp.send(ops, item, Req, Res);
                            }
                        }
                    }
                }
            });
        })();
    };

    //表单检查
    exp.chkForm = function (params, chk_params, Res, item) {
        if(chk_params && !item.validate.rule){
            throw `the item "${item.path}" not setting the rule`;
        }
        var ret = val.chk(params, chk_params, item.validate.rule);
        if (ret === true) {
            if (params.hasOwnProperty("is_submit") && params.is_submit == 0) {
                Res.end('{"code":0}');
                return false;
            }
        } else {
            var [key, message] = ret;
            message = (item.validate.prefix||"") + message + (item.validate.suffix||"");
            Res.end(JSON.stringify({code: -3, message:message, key:key }));
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

        if(item.type=="bin") {
            data = new Buffer(ops.data);
            var byteLen = Buffer.byteLength(data);
            //var boundaryKey = ops.data.substr(data.indexOf("WebKitFormBoundary"),34);
            //log({data,byteLen,boundaryKey});
            //req.setHeader('Content-Type', 'multipart/form-data; boundary=----' + boundaryKey);
            //req.setHeader('Content-Length', byteLen);
            url.headers['Content-Type'] = 'multipart/form-data; charset=UTF-8';//; boundary=----' + boundaryKey;
            url.headers['Content-Length'] = byteLen;
        }

        for(var key in exp.session){
            url.headers[key] = exp.session[key] || "";
        }

        if (ops.type.toLowerCase() == "get") {
            //url = "http://" + url.host + ":" + url.port + url.path;
            url.path += "?" + uriData;
            data = "";
            url.headers["Content-Length"] = 0;
        }
        log("\n=============== Service Info ================");
        log("TIME: "+date.now());
        log("TYPE: " + ops.type);
        log("URL: " + url.host+":"+url.port);
        log("PATH: " + PATH);
        //log("DATA: " + data.replace(/(password\w*=)\w+/ig,"$1******"));
        log(`DATA: ${new Buffer(data)}`);
        log(`Content-Type: ${url.headers['Content-Type']}`);
        log(`Content-Length: ${url.headers['Content-Length']}`);
        log(`User-Agent: ${Req.headers['user-agent']}`);
        //log(`Headers:\n ${JSON.stringify(Req.headers,null,4)}`);
        var req = http.request(url, function (res) {
            res.setEncoding("utf8");
            log('STATUS: ' + res.statusCode);
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
                log("连接JAVA被拒绝.........");
            }else{
                log("远程服务器出错, 错误代码是: "+err.code+".................");
            }
            Res.end('{"code":500}');
        });
        req.write(data);
        //req.write(data + "\n");
        req.end();
    };

    //处理返回结果
    exp.parseResult = function (body,Res,item,ops) {
        var jsonObj = {};
        try {
            jsonObj = JSON.parse(body);
            log("RESULT: "+JSON.stringify(jsonObj,null,4));
        } catch (e) {
            log("RESULT: "+body);
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