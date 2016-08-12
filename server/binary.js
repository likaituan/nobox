/**
 * 远程动态服务器
 * Created by likaituan on 15/8/26.
 */

var fs = require("fs");

//报错处理
var Error = function(err){
    console.log(err);
    err.code == "EADDRINUSE" && console.log("服务器地址及端口已被占用");
    err && err.stack && console.log(err.stack);
};

module.exports = {
    serverList: {},
    paths: {},

    //初始化
    init: function (config) {
        if(config) {
            var paths = Array.isArray(config) ? config : [config];
            paths.forEach( (item) => {
                this.paths[item.path] = item;

                this.fun = item.file;
            });
        }
    },

    //获取参数
    getParams: function(url, item){
        return url.replace(item.path,"").replace(/^\/|\/$/g,"").split("/");
    },

    //转发远程
    parse: function(Req, Res, item) {

        this.fun({
            params: this.getParams(Req.url,item),
            session: {}
        }, function (data) {
            var stream = data.stream || data.filename && fs.createReadStream(data.filename);
            if(stream) {
                Res.writeHead(200, {"Content-Type": "application/octet-stream;charset=utf-8"});
                stream.pipe(Res);
            }else{
                Res.writeHead(404, {"Content-Type": "text/plain;charset=utf-8"});
                Res.end();
            }
        });
    }

};
