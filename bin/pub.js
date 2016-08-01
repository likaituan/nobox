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
    config.onPubBefore && !args.onlyPub && config.onPubBefore(cmdFun);
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
    var source = pub.packages || [];
    pub.staticDir && source.push(pub.staticDir);
    pub.nodeDir && source.push(pub.nodeDir);
    if(source.length>0) {
        if(fs.existsSync("./nobox.config.js")){
            source.push("./nobox.config.js");
        }
        source = source.join(" ");
        ex.spawn(`tar -zcf ${exp.tarFile} ${source}`, showTip);
    }else{
        console.log("source is empty");
    }
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
exp.publish = function(){
    var port = pub.remotePort || config.port;
    var cmd = `ssh ${exp.sshArgs} ${exp.user}@${exp.ip}`.split(/\s+/);
    var timestamp = Date.now() - new Date().getTimezoneOffset()*60000;
    var date = new Date(timestamp).toISOString().replace(/T|\./g,"_").replace("Z","");
    process.platform=="win32" && cmd.push(`"nohup node \`npm root -g\`/nobox/bin/cli.js pub_server port=${port} dir=${exp.dir} env=${args.env} > ${exp.dir}/logs/${date}.log 2>&1 &"`);
    process.platform!="win32" && cmd.push(`nohup node \\\`npm root -g\\\`/nobox/bin/cli.js pub_server port=${port} dir=${exp.dir} env=${args.env} \\> ${exp.dir}/logs/${date}.log 2\\>\\&1 \\&`);
    //console.log(cmd);
    ex.spawn(cmd, showTip);
};


module.exports = function(_args, _ops) {
    args = _args;
    ops = _ops;

    exp.cmdList = [];
    args.env = args.more[0];

    if (!args.env) {
        throw "please select a environment before!";
    }
    try {
        args.currentBranch = cp.execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
    }catch(e){}

    config = ex.getConfig(args, ops);
    args.show && console.log(config);
    pub = config.pub;
    if(!pub) {
        throw "please setting publish option 'pub' before!";
    }
    exp.ip = pub.remoteIp;
    if(!exp.ip){
        throw "please setting pub option 'remoteIp' before!";
    }
    exp.dir = pub.remoteDir; //暂时写死
    if (!exp.dir) {
        throw "please setting pub option 'remoteDir' before!";
    }
    chkPubBefore();
};