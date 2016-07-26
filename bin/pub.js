/**
 * 发版客户端脚本
 */

var fs = require("fs");
var cp = require("child_process");
var ex = require("./ex");

var args = {};
var ops = {};

var config = {};
var exp = {};
var pub;

//cmd对外接口
var cmdFun = function(cmdExp) {
    exp.cmdList.push(cmdExp);
};

//上传前检查
var chkPubBefore = function(){
    config.onPubBefore && config.onPubBefore(cmdFun);
    exp.cmdList.length>0 ? runCmd() : exp.pack();
};

//上传前循环执行命令
var runCmd = function() {
    var cmdExp = exp.cmdList.shift();
    if(cmdExp) {
        ex.spawn(cmdExp, (code) => {
            if (code == 0) {
                runCmd();
            } else {
                console.log("pub before fail!")
            }
        });
    }else{
        console.log("pub before success!");
        exp.pack();
    }
};

var steps = ["pack", "upload", "publish"];

//提示
var showTip = function(code){
    var tag = steps.shift();
    if(code==0) {
        console.log(`${tag} success!`);
        var method = steps[0];
        if(method){
            console.log(`${method}ing...`);
            exp[method]();
        }
    } else {
        console.log(`${tag} error: ${code}`);
    }
};

//打包
exp.pack = function(){
    exp.tarFile = "bin.tar.gz";
    ex.spawn(`tar -zcf ${exp.tarFile} ${pub.tarSource}`, showTip);
};

//上传
exp.upload = function() {
    exp.user = pub.remoteUser || "root";

    exp.sshArgs = "";
    var keyPath = `sshkeys/${args.env}.key`;
    if (fs.existsSync(keyPath)) {
        exp.sshArgs = `-i ${keyPath}`;
    }
    var cmd = `scp ${exp.sshArgs} ${exp.tarFile} ${exp.user}@${exp.ip}:${exp.dir}/bin.tar.gz`;
    ex.spawn(cmd, function(code){
        cp.execSync(`rm -rf ${exp.tarFile}`);
        showTip(code);
    });
};

//发版
exp.publish_bak = function(){
    var port = pub.remotePort || config.port;
    //var cmd = `ssh ${exp.sshArgs} ${exp.user}@${exp.ip}`.split(/\s+/).concat(`node \`npm root -g\`/nobox/bin/cli.js pub_server port=${port} dir=${exp.dir} env=${args.env}`);
    var cmd = `nohup node /Users/likaituan/github/nobox/bin/cli.js pub_server dir=/Users/likaituan/2cash port=8888 env=test > /Users/likaituan/2cash/1.log 2>&1 &`;
    /*
    var cmd = process.platform == "win32"
        ? `ssh ${exp.sshArgs} ${exp.user}@${exp.ip}`.split(/\s+/).concat(`sh \`npm root -g\`/nobox/bin/pub_server.sh ${port} ${exp.dir} ${args.env}`)
        : `ssh ${exp.sshArgs} ${exp.user}@${exp.ip} "sh \\\`npm root -g\\\`/nobox/bin/pub_server.sh ${port} ${exp.dir} ${args.env}"`;*/
    //console.log(cmd);
    ex.spawn(cmd, showTip);
};

//发版
exp.publish = function(){
    var port = pub.remotePort || config.port;

    var cmd = `nohup node /Users/likaituan/github/nobox/bin/cli.js pub_server dir=/Users/likaituan/2cash port=8888 env=test > /Users/likaituan/2cash/1.log 2>&1 &`;
    ex.spawn(cmd, showTip);
};


module.exports = function(_args, _ops) {
    args = _args;
    ops = _ops;

    exp.cmdList = [];
    args.env = args.more[0];

    if (args.env) {
        try {
            args.currentBranch = cp.execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
        }catch(e){}

        config = ex.getConfig(args, ops);
        pub = config.pub || {};
        exp.ip = pub.remoteIp;
        exp.dir = pub.remoteDir; //暂时写死

        if (exp.ip && exp.dir) {
            chkPubBefore();
        } else {
            console.log("please setting publish option before!");
        }
    } else {
        console.log("please select a environment before!");
    }
};