var env = require("./node/env");

module.exports = function(args){
    var [java, node, pub] = env.getEnv(args);
    var config = {
        //静态服务器
        static: {
            path: "/",
            dir: `${__dirname}/dist/`
        },
        //远程服务器
        remote: {
            //远程IP及service路由
            items:[
                {
                    path: "/service/",
                    host: java.host,
                    port: java.port,
                    file: require("./node/service")
                }
            ],
            //表单验证
            validate: {
                rule: require("./node/rule"),
                lang: "pt",
                langFile: require("./node/pt_rule")
            },

            contentType: "json",        //请求数据类型
            headerKeys: ["sessionId", "userId","orderId","Accept-Language"],      //表头信息
            //返回数据统一处理
            getResult: function (rs) {
                return {
                    success: rs.code == 1000,
                    code: rs.code,
                    data: rs.data,
                    message: rs.code == 1000 ? rs.message : `${rs.message}`
                };
            }
        },

        port: args.port || node.port,           //node端口
        startTip: "hide",                       //隐藏系统的提示

        //发版之前触发的事件
        onPubBefore: function(cmd){
            cmd(`git pull origin ${args.currentBranch}`);
            cmd("npm run build");
        },

        //发版配置
        pub: {
            staticDir: "dist/",
            nodeDir: "node/",
            packages: ["my.config.js", "env.list.js"],
            remoteUser: pub.user || "root",
            remoteDir: pub.dir || "/data/fegroup/2cash",
            remotePort: pub.port || 3001,
            remoteIp: pub.ip,
            key: pub.key,
            mid: pub.mid
        },

        gzip: true,         //gzip传输压缩
        forever: true       //进程守护

    };

    //本地环境允许跨域
    if(node.env=="local") {
        config.remote.crossDomain = "*";               //设置许可的跨域IP或域名
    }

    return config;
};