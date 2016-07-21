var cp = require("child_process");

var cmdList = [];

//执行命令
//cmdExp = Array | String
var runCmd = function(cmdExp, callback){
    var args = cmdExp;
    if(typeof args=="string") {
        args = args.split(/\s+/);
    }
    var cmd = args.shift();
    if(cmd=="npm" && process.platform=="win32"){
        cmd = "npm.cmd"
    }
    var ls = cp.spawn(cmd, args, {shell: true});

    ls.stdout.on('data', (data) => {
        var str = data.toString();
        console.log(str);
    });

    ls.stderr.on('data', (data) => {
        var str = data.toString();
        !str.includes("not in PATH env variable") && process.stderr.write(data);
    });

    ls.on('close', callback);
};

//异步执行
var exp = module.exports = function(cmd) {
    cmdList.push(cmd);
};

//同步执行
exp.sync = function(cmd) {
    return cp.execSync(cmd);
};

//命令开始
exp.start = function() {
    cmdList = [];
};

//命令结束
exp.end = function() {
    var cmd = cmdList.shift();
    cmd && runCmd(cmd, exp.done);
};

