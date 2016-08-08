/**
 * 发版客户端脚本
 */

var fs = require("fs");
var path = require("path");
var cp = require("child_process");
var ex = require("./ex");

var args = {};
var ops = {};

var config = {};
var exp = {};
var pub;
var mid;

//cmd对外接口
var cmdFun = function(cmdExp) {
    exp.cmdList.push(cmdExp);
};

var getDate = function(){
    var timestamp = Date.now() - new Date().getTimezoneOffset()*60000;
    var date = new Date(timestamp).toISOString().replace(/T|\./g,"_").replace("Z","");
    return date;
};

//上传前检查
var chkPubBefore = function(){
    config.onPubBefore && !args.onlyPub && config.onPubBefore(cmdFun);
    exp.cmdList.length>0 ? runCmd() : startPub();
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
        startPub();
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

//开始上传
var startPub = function(){
    var dir = args.localDir || path.resolve("./");
    exp.tarFile = `${dir}/bin.tar.gz`;
    if(fs.existsSync(exp.tarFile)){
        steps.shift();
        console.log(`uploading...`);
        exp.upload();
    }else {
        exp.pack();
    }
};

//打包
exp.pack = function(){
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
    var o = mid || pub;
    exp.sshArgs = "";
    if (o.key && fs.existsSync(o.key)) {
        exp.sshArgs = `-i ${o.key}`;
    }
    var cmd = `scp ${exp.sshArgs} ${exp.tarFile} ${o.user}@${o.ip}:${o.dir}/bin.tar.gz`;
    //console.log(cmd);
    ex.spawn(cmd, function(code){
        cp.execSync(`rm -rf ${exp.tarFile}`);
        showTip(code);
    });
};

//发版
exp.publish = function(){
    var cmd;
    if(mid){
        var key = pub.key ? `pub.key=${pub.key}` : '';
        cmd = `ssh ${exp.sshArgs} ${mid.user}@${mid.ip}`.split(/\s+/);
        cmd.push(`"nobox pub ${args.env} localDir=${mid.dir} ${key} pub.remoteUser=${pub.user} pub.remoteIp=${pub.ip} pub.remotePort=${pub.port} pub.remoteDir=${pub.dir}"`);
        //console.log(cmd);
        ex.spawn(cmd, showTip);
    }else{
        var date = getDate();
        cmd = `ssh ${exp.sshArgs} ${pub.user}@${pub.ip}`.split(/\s+/);
        cmd.push(`"nohup nobox pub_server port=${pub.port} dir=${pub.dir} env=${args.env} > ${pub.dir}/logs/${date}.log 2>&1 &"`);
        //console.log(cmd);
        ex.spawn(cmd, showTip);
    }
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
    pub = config.pub || args.pub;
    if(!pub) {
        throw "please setting publish option 'pub' before!";
    }
    pub.user = pub.remoteUser || "root";
    pub.port = pub.remotePort || config.port;
    pub.ip = pub.remoteIp;
    pub.dir = pub.remoteDir;
    if(!pub.ip){
        throw "please setting pub option 'remoteIp' before!";
    }
    if (!pub.dir) {
        throw "please setting pub option 'remoteDir' before!";
    }
    if(pub.mid) {
        mid = pub.mid;
        mid.user = mid.user || "root";
    }
    args.show && console.log("args=",args,"\n\nops=",ops,"\n\nconfig=",config);
    chkPubBefore();
};