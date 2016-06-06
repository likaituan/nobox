/**
 * 静态服务器
 * Created by likaituan on 15/8/26.
 */

~function(req, exp) {
    "use strict";
	var fs = req("fs");
    var mime = req("./mime");
	var tp = req("../core/template");

    exp.paths = {};
    exp.dir = "/";          //静态目录
	exp.path = "/";         //静态路由
	exp.model = null;       //模型
    exp.htmlList = {};

    //初始化
    exp.init = function(){
        for(var path in exp.paths) {
            var item = exp.paths[path];
            if (item.file) {
                exp.htmlList[path] = fs.readFileSync(item.file);
            }
        }
    };

	//未做缓存
    exp.parse = function (Req, Res,item) {
        //单文件匹配
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
        ext = mime[ext] || "text/plain";
        var encode = /^image\/|^audio\//.test(ext) ? 'binary' : 'utf-8';
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
    };
}(require, exports);
