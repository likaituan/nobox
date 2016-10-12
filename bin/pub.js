/**
 * 发版客户端脚本
 */

var fs = require("fs");
var path = require("path");
var {log,end,cmd,getArgs} = require("ifun");
var ex = require("./ex");

var args = {};
var config = {};

var pub;
var mid;

var pubIndex = -1;
var pubCount = 0;

var localDir;
var cmdList;
var tarFile;
var sshArgs;
var isShow;

//cmd对外接口
var cmdFun = function(cmdExp) {
    cmdList.push(cmdExp);
};

var getDateTime = function(){
    var timestamp = Date.now() - new Date().getTimezoneOffset()*60000;
    return new Date(timestamp).toISOString().replace(/:[^:]*$/,"").replace(/\W/g,"").replace("T","_");
};

//远程登录发版
var loginPub = function(){
    var sshKey = getSshKey(mid.key);
    var cmdExp = `ssh ${sshKey} ${mid.user}@${mid.ip} "nobox pub ${args.env} ${isShow} dir=${mid.gitDir}"`;
    log("now is login to publish machine, please wait a moment...");
    cmd(cmdExp, localDir, publishFinish);
};


//上传前检查
var chkPubBefore = function(){
    config.onPubBefore && !args.onlyPub && config.onPubBefore(cmdFun);
    cmdList.length>0 ? runCmd() : startPub();
};

//上传前循环执行命令
var runCmd = function() {
    var cmdExp = cmdList.shift();
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
    pubIndex = 0;
    pubCount = mid && mid.ips.length || pub.ips.length;

    var dir = args.dir || ".";//path.resolve("./");
    tarFile = `${dir}/bin.tar.gz`;
    if(fs.existsSync(tarFile)){
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
        var cmdExp = `tar -zcf ${tarFile} ${source}`;
        cmd(cmdExp, localDir, publishBegin);
    }else{
        log("source is empty");
    }
};

//获取key
var getSshKey = function(key){
    if(key){
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

//数字to第几
var getTh = function(n){
    return n + ([0,"st","nd","rd"][n]||"th");
};

//开始发版
var publishBegin = function(){
    args.show && log({pubIndex,pubCount,currentOption:mid?"local-mid":"mid-pro"});
    if(pubCount>1){
        log(`\n===================================\n`);
        log(`now is publishing the ${getTh(pubIndex+1)} machine:`);
    }
    uploadPackage();
};

//上传压缩包
var uploadPackage = function() {
    log(`uploading...`);

    if(pub.isParallel) {
        cmd(`cp ${tarFile} ${pub.dir}/bin.tar.gz`, uploadPackageFinish);
    }else{
        var o = mid || pub;
        var ip = o.ips[pubIndex];
        sshArgs = getSshKey(o.key);
        var cmdExp = `scp ${sshArgs} ${tarFile} ${o.user}@${ip}:${o.dir}/bin.tar.gz`;
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
    if (mid) {
        var key = mid.key ? `pub.key=${pub.key}` : '';
        var ips = pub.ips.join(",");
        cmdExp = `nobox pub ${args.env} ${isShow} dir=${mid.dir} ${key} pub.user=${pub.user} pub.ips=${ips} pub.port=${pub.port} pub.dir=${pub.dir}`;
        cmdExp = `ssh ${sshArgs} ${mid.user}@${mid.ip}`.split(/\s+/).concat(`"${cmdExp}"`);
    } else {
        var time = getDateTime();
        var date = time.split("_");
        cmdExp = `nohup nobox deploy port=${pub.port} env=${args.env} time=${time} dir=${pub.dir} user=${config.ua.user} ${isShow} > ${pub.dir}/logs/${date}.log 2>&1 &`;
        if(!pub.isParallel){
            var ip = pub.ips[pubIndex];
            cmdExp = `ssh ${sshArgs} ${pub.user}@${ip}`.split(/\s+/).concat(`"${cmdExp}"`);
        }
    }
    cmd(cmdExp, localDir, publishFinish);
};

//发版完成
var publishFinish = function(code){
    if(code!=0){
        end("publish fail!");
    }
    if(pubCount>1) {
        log(`the ${getTh(pubIndex+1)} machine publish finish!`);
        pubIndex++;
        if (pubIndex < pubCount) {
            return publishBegin();
        }
    }
    cmd(`rm -rf ${tarFile}`, localDir);
    log("publish success!");
};


module.exports = function(ua) {
    args = getArgs("cmd", "env");
    isShow = args.show ? "--show" : "";

    cmdList = [];
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
    pub.ips = pub.ips || [pub.ip];
    if (!pub.dir) {
        throw "please setting option 'pub.dir' before!";
    }
    if(!pub.isParallel && !pub.ip && !pub.ips){
        throw "please setting option 'pub.ip' before!";
    }
    mid = pub.mid;
    if(mid) {
        mid.user = mid.user || "root";
        mid.ips = mid.ips || [mid.ip];
        if(mid.gitDir){
            return loginPub();
        }
    }
    args.show && log({config});
    chkPubBefore();
};