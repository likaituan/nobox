/**
 * 发版客户端脚本
 */

var fs = require("fs");
var path = require("path");
var {log,end,cmd,getArgs} = require("ifun");
var ex = require("./ex");
var util = require("util");

var args = {};
var config = {};

var pub;
var mid;

var localDir;

var pubIndex;
var pubCount;

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
var loginPub = function(){
    var sshKey = getSshKey(mid.key, pub.keyDir);
    var isShow = args.show ? "--show" : "";
    var cmdExp = `ssh ${sshKey} ${mid.user}@${mid.ip} "nobox pub ${args.env} ${isShow} dir=${mid.gitDir}"`;
    log("now is login to publish machine, please wait a moment...");
    cmd(cmdExp, localDir, publishFinish);
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
    pubIndex = 1;
    pubCount = pub.ips.length;
    var dir = args.dir || ".";//path.resolve("./");
    exp.tarFile = `${dir}/bin.tar.gz`;
    if(fs.existsSync(exp.tarFile)){
        publishBegin();
    }else {
        pack();
    }
};

//打包
var pack = function(){
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
        cmd(cmdExp, localDir, publishBegin);
    }else{
        log("source is empty");
    }
};

//获取key
var getSshKey = function(key, dir){
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

//开始发版
var publishBegin = function(){
    if(pubCount>1){
        log(`now is publishing the ${pubIndex}`);
    }
    uploadPackage();
};

//上传压缩包
var uploadPackage = function() {
    log(`uploading...`);

    if(pub.isParallel) {
        cmd(`cp ${exp.tarFile} ${pub.dir}/bin.tar.gz`, uploadPackageFinish);
    }else{
        var o = mid || pub;
        var ip = o.ips[pubIndex];
        exp.sshArgs = getSshKey(o.key, o.keyDir);
        var cmdExp = `scp ${exp.sshArgs} ${exp.tarFile} ${o.user}@${ip}:${o.dir}/bin.tar.gz`;
        cmd(cmdExp, localDir, uploadPackageFinish);
    }
};

//上传压缩包完成
var uploadPackageFinish = function(code) {
    if(code!=0){
        end("upload fail!");
    }
    publish();
};

//发版
var publish = function(){
    log(`publishing...`);

    var cmdExp;
    var date;
    if(pub.isParallel){
        date = getDate();
        cmdExp = `nohup nobox deploy user=${config.ua.user} port=${pub.port} dir=${pub.dir} env=${args.env} > ${pub.dir}/logs/${date}.log 2>&1 &`;
        cmd(cmdExp, localDir, publishFinish);
    }else {
        var ip = pub.ips[pubIndex];
        if (mid) {
            var key = pub.key ? `pub.key=${pub.key}` : '';
            cmdExp = `ssh ${exp.sshArgs} ${mid.user}@${mid.ip}`.split(/\s+/);
            cmdExp.push(`"nobox pub ${args.env} localDir=${mid.dir} ${key} pub.user=${pub.user} pub.ip=${ip} pub.port=${pub.port} pub.dir=${pub.dir}"`);
            cmd(cmdExp, localDir, publishFinish);
        } else {
            date = getDate();
            cmdExp = `ssh ${exp.sshArgs} ${pub.user}@${ip}`.split(/\s+/);
            cmdExp.push(`"nohup nobox deploy port=${pub.port} dir=${pub.dir} env=${args.env} > ${pub.dir}/logs/${date}.log 2>&1 &"`);
            cmd(cmdExp, localDir, publishFinish);
        }
    }
};

//发版完成
var publishFinish = function(code){
    if(code!=0){
        end("publish fail!");
    }
    if(pubCount>1){
        log(`the ${pubIndex} machine publish finish!`);
    }
    if(pubIndex < pubCount) {
        pubIndex++;
        pubBegin();
    }else{
        cmd(`rm -rf ${exp.tarFile}`, localDir);
        log("publish success!");
    }
};


module.exports = function(ua) {
    args = getArgs("cmd", "env");

    exp.cmdList = [];
    localDir = args.dir  = args.dir || args.localDir || ua.path;

    if (!args.env) {
        end("please select a environment before!");
    }
    try {
        args.currentBranch = cmd("git rev-parse --abbrev-ref HEAD", localDir);
    }catch(e){}

    config = ex.getConfig(args, ua);
    pub = config.pub || args.pub;
    if(!pub) {
        throw "please setting publish option 'pub' before!";
    }
    //remote+key为兼容旧版
    pub.user = pub.user || pub.remoteUser || "root";
    pub.port = pub.port || pub.remotePort || config.port;
    pub.ip = pub.ip || pub.remoteIp;
    pub.dir = pub.dir || pub.remoteDir;
    pub.ips = util.isArray(pub.ip) ? pub.ip : [pub.ip];
    if (!pub.dir) {
        throw "please setting pub option 'remoteDir' before!";
    }
    if(pub.isParallel && !pub.ip){
        throw "please setting pub option 'remoteIp' before!";
    }
    args.show && log({config});
    if(pub.mid) {
        mid = pub.mid;
        mid.user = mid.user || "root";
        if(mid.gitDir){
            return loginPub();
        }
    }
    chkPubBefore();
};