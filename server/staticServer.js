/**
 * 静态服务器
 * Created by likaituan on 15/8/26.
 */

~function(req, exp) {
    "use strict";
	var fs = req("fs");
    var mime = req("./mime");
	var tp = req("../core/template");
    var pk = require("../package.json");
    var zlib = require('zlib');

    exp.paths = {};
    exp.dir = "/";          //静态目录
	exp.path = "/";         //静态路由
	exp.model = null;       //模型
    exp.htmlList = {};

    //初始化
    exp.init = function(server){
        exp.server = server;
        for(var path in exp.paths) {
            var item = exp.paths[path];
            if (item.file) {
                exp.htmlList[path] = fs.readFileSync(item.file);
            }
        }
    };

	//未做缓存
    exp.parse = function (Req, Res,item) {
        //单文件匹配(缓存)
        var code = exp.htmlList[item.path];
        if(code){
            Res.writeHead(200, {'Content-Type': 'text/html'});
            Res.end(code);
            return;
        }

        var re = new RegExp("^"+item.path,"i");
        var file = Req.url.replace(/\?.*$/,"").replace(re, "");
        if (file == item.path || (file+"/") == item.path) {
            file = "index.html";
        }

        var ext = file.split(".").slice(-1)[0] || "txt";
        var mimeType = mime[ext] || "text/plain";
        var isGzip = exp.server.gzip && /^(?:js|css|html|txt|json)$/i.test(ext);

        /*
         var encode = /^image\/|^audio\//.test(mimeType) ? 'binary' : 'utf-8';
        fs.readFile(item.dir + file, encode, function (err, data) {
            if (err) {
                Res.writeHead(404, {'Content-Type': 'text/plain'});
                Res.end("file is not found!");
            } else {
                Res.writeHead(200, {'Content-Type': ext});
                if(file=="index.html" && exp.model){
                    data = tp.compile(data)(exp.model);
                }
                Res.write(data, encode);
                Res.end();
            }
        });
        */

        var res_headers = {};
        res_headers["Server"] = `${pk.name}/${pk.version}`;
        
        var fullFile = item.dir + file;
        var existFile = fs.existsSync(fullFile);
        if(existFile) {
            var gzipStream = zlib.createGzip();
            res_headers["Content-Type"] = `${mimeType};charset=utf-8`;

            var stream = fs.createReadStream(fullFile);
            if (isGzip) {
                res_headers["Content-Encoding"] = "gzip";
                Res.writeHead(200, res_headers);
                stream.pipe(gzipStream).pipe(Res);
            } else {
                Res.writeHead(200, res_headers);
                stream.pipe(Res);
            }
        }else {
            res_headers["Content-Type"] = "text/plain;charset=utf-8";
            Res.writeHead(404, res_headers);
            Res.end("file is not found!");
        }

    };
}(require, exports);
