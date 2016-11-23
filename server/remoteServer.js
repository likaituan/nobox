/**
 * 远程动态服务器
 * Created by likaituan on 15/8/26.
 */

var fs = require("fs");
var qs = require("querystring");
var http = require("http");
var https = require("https");
var _params = require("./params");

var ex = require("../core/ex");
var pk = require("../package.json");
var str = require("../core/string");
var date = require("../core/date");
var val = require("../validate/validate");
var util = require("util");
var nodeUrl = require("url");
var {getClientIp,log} = require("ifun");

var ops;
var resHeaders;

//报错处理
var Error = function(err){
    log(err);
    err.code == "EADDRINUSE" && log("服务器地址及端口已被占用");
    err && err.stack && log(err.stack);
};

exports.items = {};
exports.serviceList = {};

//初始化
exports.init = function (config, db) {
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
            exports.items[item.path] = item;
        }
    });

    //添加到映射表
    for(var p in exports.items) {
        var item = exports.items[p];
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
            var o = exports.serviceList[p] = {};
            fs.readdirSync(item.dir).forEach(function(fileName){
                var key = fileName.split(".")[0];
                o[key] = require(item.dir + key);
            });
        } else if (item.file) {
            exports.serviceList[p] = item.file;
        }
    }
};

//转发远程
exports.parse = function (req, res, item) {
    ops = {};
    resHeaders = {};
    req.isMultipart = /multipart/.test(req.headers["content-type"]);

    resHeaders["Content-Type"] = "text/html;charset=utf-8";
    resHeaders["Server"] = `${pk.name}/${pk.version}`;
    if(item.crossDomain){
        resHeaders["Access-Control-Allow-Origin"] = item.crossDomain;
        resHeaders["Access-Control-Allow-Credentials"] = false;
        //resHeaders["Access-Control-Allow-Headers"] = "userId,sessionId";//"X-Custom-Header";//"X-Requested-With";
        resHeaders["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
        if(item.headerKeys){
            resHeaders["Access-Control-Allow-Headers"] += "," + item.headerKeys.join(",");
        }
        resHeaders["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS";//"PUT,POST,GET,DELETE,OPTIONS";
    }
    if(req.method=="OPTIONS"){
        res.writeHead(204, resHeaders);
        res.end();
        return;
    }
    res.writeHead(200, resHeaders);

    var re = new RegExp("^"+item.path,"i");
    //var url = req.url.replace(re, "").split("/");
    var url = req.url.replace(re, "").replace(/\?.*$/,"").split("/");
    var serviceList = exports.serviceList[item.path];
    var file = item.dir ? url.shift() : null;
    var method = url.join("/");
    (function () {
        var fun;
        if(item.dir){
            fun = serviceList[file];
            if(typeof(fun)!="object"){
                log("service [ "+file+" ] 文件不存在");
                res.end('{"code":500}');
                return;
            }
            fun = fun[method];
        }else if(item.file){
            fun = serviceList[method];
        }
        if(typeof(fun)!="function"){
            log("service [ "+method+" ] 方法不存在");
            res.end('{"code":500}');
            return;
        }
        _params.getParams(req, function (data) {
            exports.session = {};
            (item.headerKeys||[]).forEach(function(key){
                var v = req.headers[key.toLowerCase()];
                exports.session[key] = v=="undefined" ? undefined : v;
            });
            exports.session.ip = exports.session.ip || getClientIp(req);
            /*
            if(item.type=="binary"){
                fun({
                    params: params,
                    session: exports.session
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
                        res.writeHead(200, headJson);

                        stream.pipe(res);
                    }else{
                        res.writeHead(404, {"Content-Type": "text/plain;charset=utf-8"});
                        res.end();
                    }
                });
                return;
            }
            */

            ops.data = data;
            ops.server = fun(ops.data.fields, exports.session);

            if(item.type=="json") {
                res.end(JSON.stringify({
                    success: true,
                    code: 0,
                    data: ops.server
                }));
            }else{
                if(item.dataKeys){
                    item.dataKeys.forEach(function(key){
                        ops.server.data[key] = exports.session[key];
                    });
                }
                var isPass = exports.chkForm(ops.data.fields, ops.server.chk, res, item);
                if(isPass){
                    if(item.type=="mongodb"){
                        if(!exports.db){
                            log("you not install mongodb!");
                            res.end(`{"code":500}`);
                            return;
                        }
                        var doRet = function(ret){
                            ret.code = ret.code || 0;
                            res.end(JSON.stringify({
                                success: ret.code==0,
                                code: ret.code,
                                data: ret.data || {},
                                message: ret.message || ""
                            }));
                        };
                        var doAction = function(){
                            if(ops.action && ops.table && ops.data) {
                                exports.db[ops.action](ops.table, ops.data, doRet);
                            }else{
                                doRet({code:0});
                            }
                        };
                        if(ops.server.onBefore){
                            ops.server.onBefore(exports.db, function(ret){
                                ret ? doRet(ret) : doAction();
                            })
                        }else {
                            doAction();
                        }
                    }else {
                        if(util.isFunction(ops.server)) {
                            ops.server(req, res);
                        }else if(util.isFunction(ops.server.callback)){
                            ops.server.callback(req, res);
                        }else {
                            ops.server.url = str.format(ops.server.url, ops.data.fields); //地址栏格式化
                            exports.send(ops, item, req, res);
                        }
                    }
                }
            }
        });
    })();
};

//表单检查
exports.chkForm = function (fields, chk_params, res, item) {
    if(chk_params && !item.validate.rule){
        throw `the item "${item.path}" not setting the rule`;
    }
    var ret = val.chk(fields, chk_params, item.validate.rule);
    if (ret === true) {
        if (fields.hasOwnProperty("is_submit") && fields.is_submit == 0) {
            res.end('{"code":0}');
            return false;
        }
    } else {
        var [key, message] = ret;
        message = (item.validate.prefix||"") + message + (item.validate.suffix||"");
        res.end(JSON.stringify({code: -3, message:message, key:key }));
        return false;
    }
    return true;
};

//转发请求
exports.send = function (ops, item, req, res) {
    var contentType = item.contentType || "x-www-form-urlencoded";
    var uriData = qs.stringify(ops.server.data);
    var jsonData = JSON.stringify(ops.server.data);
    ops.query = ({
        "json": jsonData,
        "x-www-form-urlencoded": uriData
    })[contentType];
    
    if(req.isMultipart){
        ops.query = JSON.stringify(ops.data.fields);
    }
    var PATH = (item.prefix||"") + ops.server.url;

    var options = {
        host: item.host,
        port: item.port,
        path: PATH,
        method: ops.server.type,
        headers: {
            "Cookie": req.headers.cookie || "",
            "Content-Type": "application/"+contentType+"; charset=UTF-8"
            //,"Content-Length": data.replace(/[^\x00-\xff]/g,"aa").length
            //,"Content-Length": data.length
        }
    };
    if(/^https?:\/\//.test(ops.url)){
        var urlJson = nodeUrl.parse(ops.url);
        options.host = urlJson.hostname;
        options.port = urlJson.port;
        if(urlJson.port==null){
            if(/^https:\/\//.test(ops.url)){
                options.port = 443;
            }else{
                options.port = 80;
            }
        }
        options.path = urlJson.path;
        PATH = options.path;
    }
    if(req.isMultipart){
        options.headers["Content-Type"] = req.headers["content-type"];
        options.headers["Content-Length"] = req.headers["content-length"];
    }

    /*
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
    */
  
    console.log("url=",options);
    for(var key in exports.session){
        options.headers[key] = exports.session[key] || "";
    }

    if (ops.server.type.toLowerCase() == "get") {
        //url = "http://" + options.host + ":" + options.port + options.path;
        options.path += "?" + uriData;
        ops.query = "";
        options.headers["Content-Length"] = 0;
    }
    log("\n=============== Service Info ================");
    log("TIME: "+date.now());
    log("TYPE: " + ops.server.type);
    log("URL: " + options.host+":"+options.port);
    log("PATH: " + PATH);
    log("HEADERS: " + JSON.stringify(exports.session));
    log("DATA: " + ops.query.replace(/(password\w*=)\w+/ig,"$1******"));
    //log(`DATA: ${new Buffer(ops.data.fields)}`);
    log(`Content-Type: ${options.headers['Content-Type']}`);
    log(`Content-Length: ${options.headers['Content-Length']}`);
    log(`User-Agent: ${req.headers['user-agent']}`);
    //log(`Headers:\n ${JSON.stringify(req.headers,null,4)}`);

    exports.send2remote([options, ops, req.isMultipart], function(rs){
        if(rs.code==200){
            exports.parseResult(rs.data,res,item,ops);
        }else{
            res.end(JSON.stringify(rs));
        }
    });
};

//发送到远程
exports.send2remote = function(args, callback){
    var [options,ops,isMultipart] = args;
    var httpx = options.port==443 ? https : http;
    var req = httpx.request(options, function (res) {
        res.setEncoding("utf8");
        log('STATUS: ' + res.statusCode);
        var body = "";
        res.on('data', function (chunk) {
            body += chunk;
        }).on("end", function () {
            callback({code: 200, data:body});
        }).on('error', function (e) {
            callback({code: res.statusCode, message: e.message});
        });
    });
    req.on('error', function (err) {
        if(err.code=="ECONNREFUSED"){
            log("连接JAVA被拒绝.........");
        }else{
            log("远程服务器出错, 错误代码是: "+err.code+".................");
        }
        callback({code:500});
    });
    if(isMultipart){
        ops.data.stream.pipe(req, {end:false});
        ops.data.stream.on('end', function() {
            req.end();
        });
    }else {
        req.end(ops.query);
    }
};

//处理返回结果
exports.parseResult = function (body,res,item,ops) {
    var jsonObj = {};
    try {
        jsonObj = JSON.parse(body);
        log("RESULT: "+JSON.stringify(jsonObj,null,4));
    } catch (e) {
        log("RESULT: "+body);
        res.end('{"code":500}');
        return;
    }
    if(item.getResult){
        jsonObj = item.getResult(jsonObj);
    }
    if(ops.res){
        jsonObj = ops.res(jsonObj);
    }
    var jsonStr = JSON.stringify(jsonObj);
    res.end(jsonStr);
};