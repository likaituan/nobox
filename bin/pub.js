/**
 * 发版客户端脚本
 */

var fs = require("fs");
var path = require("path");
var {log,end,cmd} = require("ifun");
var ex = require("./ex");

var args = {};
var ops = {};

var config = {};
var exp = {};
var pub;
var mid;
var localDir;

//cmd对外接口
var cmdFun = function(cmdExp) {
    exp.cmdList.push(cmdExp);
};

var getDate = function(){
    var timestamp = Date.now() - new Date().getTimezoneOffset()*60000;
    //var date = new Date(timestamp).toISOString().replace(/T|\./g,"_").replace("Z","");
    var date = new Date(timestamp).toISOString().split("T")[0].replace(/\D/g,"");
    return date;
};

//远程登录发版
var remotePub = function(){
    var sshKey = getSshKey(pub.key, pub.keyDir);
    var cmdExp = `ssh ${sshKey} ${pub.user}@${pub.ip} "nobox pub test localDir=${mid.gitDir}"`;
    args.show && log(cmdExp);
    cmd(cmdExp, localDir, showTip);
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
        log({cmdExp, localDir});
        cmd(cmdExp, localDir, code => {
            if (code == 0) {
                runCmd();
            } else {
                log("pub before fail!");
            }
        });
    }else{
        log("pub before success!");
        startPub();
    }
};

var steps = ["pack", "upload", "publish"];

//提示
var showTip = function(code){
    var tag = steps.shift();
    if(code==0) {
        log(`${tag} success!`);
        var method = steps[0];
        if(method){
            log(`${method}ing...`);
            exp[method]();
        }
    } else {
        log(`${tag} error: ${code}`);
    }
};

//获取所有的Node依赖文件
var getNodeDeps = function(currentFile, deps, isLoaded){
    if(isLoaded[currentFile]){
        return [];
    }else{
        isLoaded[currentFile] = true;
        deps.push(currentFile);
        fs.getFileSync(currentFile).replace(/require\((.+?)\)/g, function(_,file){
            var subDeps = getNodeDeps(file, deps, isLoaded);
            deps = deps.concat(subDeps);
        });
    }
    return deps;
};

//开始上传
var startPub = function(){
    var dir = args.localDir || ".";//path.resolve("./");
    exp.tarFile = `${dir}/bin.tar.gz`;
    if(fs.existsSync(exp.tarFile)){
        steps.shift();
        log(`uploading...`);
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
        var configFile = `${localDir}/nobox.config.js`;
        if(fs.existsSync(configFile)){
            source.push("nobox.config.js");
            /*
            var deps = getNodeDeps("./nobox.config", [], {});
            log(deps);
            source = source.concat(deps);
            */
        }
        source = source.join(" ");
        var cmdExp = `tar -zcf ${exp.tarFile} ${source}`;
        args.show && log(cmdExp);
        cmd(cmdExp, localDir, showTip);
    }else{
        log("source is empty");
    }
};

//获取key
var getSshKey = function(key, dir){
    log({dir,key});
    if(key){
        if(dir){
            key = `${dir}/${key}`;
        }
        if (fs.existsSync(key)) {
            var mode = fs.statSync(key).mode.toString(8);
            if (/[40]{3}$/.test(mode)) {
                return `-i ${key}`;
            } else {
                end(`the key file must locked, please use the "chmod" command to change mode!`)
            }
        } else {
            end(`the key path "${key}" is no exist!`)
        }
    }
    return "";
};

//上传
exp.upload = function() {
    var o = mid || pub;
    exp.sshArgs = getSshKey(o.key, o.keyDir);
    var cmdExp = `scp ${exp.sshArgs} ${exp.tarFile} ${o.user}@${o.ip}:${o.dir}/bin.tar.gz`;
    args.show && log(cmdExp);
    cmd(cmdExp, localDir, function(code){
        cmd(`rm -rf ${exp.tarFile}`, localDir);
        showTip(code);
    });
};

//发版
exp.publish = function(){
    var cmdExp;
    if(mid){
        var key = pub.key ? `pub.key=${pub.key}` : '';
        cmdExp = `ssh ${exp.sshArgs} ${mid.user}@${mid.ip}`.split(/\s+/);
        cmdExp.push(`"nobox pub ${args.env} localDir=${mid.dir} ${key} pub.remoteUser=${pub.user} pub.remoteIp=${pub.ip} pub.remotePort=${pub.port} pub.remoteDir=${pub.dir}"`);
        args.show && log(cmdExp);
        cmd(cmdExp, localDir, showTip);
    }else{
        var date = getDate();
        cmdExp = `ssh ${exp.sshArgs} ${pub.user}@${pub.ip}`.split(/\s+/);
        cmdExp.push(`"nohup nobox deploy port=${pub.port} dir=${pub.dir} env=${args.env} > ${pub.dir}/logs/${date}.log 2>&1 &"`);
        args.show && log(cmdExp);
        cmd(cmdExp, localDir, showTip);
    }
};


module.exports = function(_args, _ops) {
    args = _args;
    ops = _ops;

    exp.cmdList = [];
    args.env = args.more[0];
    localDir = args.localDir || args.path || process.cwd();

    if (!args.env) {
        throw "please select a environment before!";
    }
    try {
        args.currentBranch = cmd("git rev-parse --abbrev-ref HEAD", localDir);
    }catch(e){}

    log({currentBranch:args.currentBranch, localDir});

    config = ex.getConfig(args, ops);
    args.show && log({config});
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
        if(mid.gitDir){
            return remotePub();
        }
    }
    args.show && log("args=",args,"\n\nops=",ops,"\n\nconfig=",config);
    chkPubBefore();
};