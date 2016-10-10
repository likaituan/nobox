/**
 * 命令列表
 * Created by likaituan on 16/7/21.
 */

var {cmd,log,end,getArgs} = require("ifun");

var exp = {
    //更新
    update: function(ua){
        var args = getArgs("cmd", "version");
        log("now is updating, please wait a moment...");
        var cmdExp = `${ua.sudo}${ua.npm} install -g ${ua.engine.name}`;
        if(args.version){
            cmdExp += `@${args.version}`;
        }
        cmd(cmdExp);
    },

    //列出所有的nobox服务器
    list: function(){
        var ps = process.platform=="linux" ? "ps -aux" : "ps aux";
        var serverList = cmd(ps).split("\n").filter(x=>x.includes("nobox")&&x.includes("deploy")&&x.includes(process.pid)===false);
        log(serverList.join("\n"));
        return serverList;
    },

    //停止服务
    stop: function(){
        var args = getArgs("cmd", "port");
        var serverList = exp.list();
        if(args.port) {
            serverList = serverList.filter(x=>x.includes(args.port));
        }
        if(serverList.length==0){
            end(`now is not nobox server in running!`);
        }
        if(serverList.length>1){
            end(`now has ${serverList.length} nobox server is running, please select one!`);
        }
        var pid = serverList[0].trim().split(/\s+/)[1];
        if(pid){
            cmd(`kill -9 ${pid}`);
            if(args.port) {
                log(`port ${args.port} is already stop!`);
            }else{
                log(`nobox is already stop!`)
            }
        }
    },

    //重启
    restart: function(){
        var args = getArgs("cmd", "port");
        if(args.port){
            cmd(`nobox stop ${args.port}`);
        }else{
            cmd("nobox stop");
        }
        cmd("nobox ");
    }
};

module.exports = exp;