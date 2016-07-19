var fs = require("fs");
var ex = require("../core/ex");

//获取参数列表
exports.getArgs = function(argv) {
    var args = {};
    args.more = [];
    args.ip = ex.getIp();
    argv.forEach(function(kv){
        kv = kv.split("=");
        var k = kv[0];
        var v = kv[1];
        if(kv.length==2){
            args[k] = v;
        }else if(/^\-\-(\w+)$/.test(k)){
            args[RegExp.$1] = true;
        }else if(/^\-(\w+)$/.test(k)){
            RegExp.$1.split("").forEach(function(k2){
                args[k2] = true;
            });
        }else{
            args.more.push(k);
        }
    });
    return args;
};

//获取配置信息
exports.getConfig = function(args, ops) {
    var config = {};
    var configFile = `${ops.currentPath}${ops.package.name}.config.js`;
    var hasFile = fs.existsSync(configFile);
    if (hasFile) {
        config = require(configFile);
        if (typeof config == "function") {
            config = config(args);
        }
    }
    config.hasFile = hasFile;
    return config;
};

//提示
exports.showTip = function(tag, err, stderr){
    if(err) {
        console.log(`${tag} error: ${stderr}`);
        return false;
    } else {
        console.log(`${tag} success!`);
        return true;
    }
};