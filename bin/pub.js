/**
 * 发版客户端脚本
 */

var fs = require("fs");
var path = require("path");
var {log,end,cmd,getArgs} = require("ifun");
var ex = require("./ex");

var config = {};
var args = {};
var ua = {};

var start;
var mid;
var pub;
var next;
var ips;
var way;

var pubIndex = -1;
var pubCount = 0;

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

//获取参数
var getParams = function(){
    var remote = [];
    if(mid){
        delete mid[start.next];
        for(let m in mid){
            let item = mid[m];
            for (let k in item) {
                item[k] && remote.push(`mid.${m}.${k}=${item[k]}`);
            }
        }
    }

    for(let k in pub){
        pub[k] && typeof(pub[k])!="object" && remote.push(`pub.${k}=${pub[k]}`);
    }
    remote = remote.join(" ");


    if(next){
        var _start = {
            puber: start.puber,
            time: start.time,
            dir: next.dir,
            rose: next.rose
        };
        if(next.keyDir) {
            _start.keyDir = next.keyDir;
        }
    }

    var local = [];
    for(let k in _start){
        _start[k] && local.push(`${k}=${_start[k]}`);
    }
    local = local.join(" ");

    return {local,remote};
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
        cmd(cmdExp, start.dir, code => {
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
    next = mid && mid[start.next] || pub;
    ips = next.host.split(",");
    pubIndex = 0;
    pubCount = ips.length;

    tarFile = `${start.dir}/bin.tar.gz`;
    if(start.rose=="pack"){
        pack();
    }else {
        publishBegin();
    }
};

//打包
var pack = function(){
    var source = pub.packages || [];
    pub.staticDir && source.push(pub.staticDir);
    pub.nodeDir && source.push(pub.nodeDir);

    if(source.length>0) {
        var configFile = `${start.dir}/nobox.config.js`;
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
        cmd(cmdExp, start.dir, publishBegin);
    }else{
        log("source is empty");
    }
};

//获取key
var getSshKey = function(key,dir){
    if(key){
        if(dir){
            key = `${dir}/${key}`;
        }
        if (fs.existsSync(key)) {
            var mode = fs.statSync(key).mode.toString(8);
            if (/[40]{3}$/.test(mode)) {
                return `-i ${key}`;
            } else {
                end(`the key file must locked, please use the "chmod" command to change mode!`);
            }
        } else {
            end(`the key path "${key}" is no exist!`);
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
    way = `${start.env}->${next.env}:`;
    args.show && log({pubIndex,pubCount});
    if(pubCount>1){
        log(`\n===================================\n`);
        log(`now is publishing the ${getTh(pubIndex+1)} machine:`);
    }
    sshArgs = getSshKey(next.key, start.keyDir);
    start.rose=="login" ? publish(): uploadPackage();
};

//上传压缩包
var uploadPackage = function() {
    log(`${way} uploading...`);

    if(args.parallel) {
        cmd(`cp ${tarFile} ${pub.dir}/bin.tar.gz`, uploadPackageFinish);
    }else{
        var ip = ips[pubIndex];
        var cmdExp = `scp ${sshArgs} ${tarFile} ${next.user}@${ip}:${next.dir}/bin.tar.gz`;
        cmd(cmdExp, start.dir, uploadPackageFinish);
    }
};

//上传压缩包完成
var uploadPackageFinish = function(code) {
    if(code!=0){
        end(`${way} upload fail!`);
    }
    log(`${way} upload success!`);
    publish();
};

//发版
var publish = function(){
    var ip = ips[pubIndex];
    var cmdExp = `ssh ${sshArgs} ${next.user}@${ip}`.split(/\s+/);

    if (next.rose=="deploy") {
        log(`${way} publishing...`);
        var date = start.time.split("_")[0];
        var params = `port=${pub.port} env=${args.env} dir=${pub.dir} time=${start.time} puber=${start.puber} ${isShow}`;
        var deployCmdExp = `nohup nobox deploy ${params} > ${pub.dir}/logs/${date}.log 2>&1 &`;
        if(args.parallel) {
            cmdExp = deployCmdExp;
        }else{
            cmdExp.push(`"${deployCmdExp}"`);
        }
    }else if(next.rose){
        log(`${way} logining...`);
        var {local,remote} = getParams();
        cmdExp.push(`"nobox pub ${args.env} ${isShow} ${local} ${remote}"`);
    }

    cmd(cmdExp, start.dir, publishFinish);
};

//发版完成
var publishFinish = function(code){
    if(code!=0){
        end(`${way} publish fail!`);
    }
    if(pubCount>1) {
        log(`the ${getTh(pubIndex+1)} machine publish finish!`);
        pubIndex++;
        if (pubIndex < pubCount) {
            return publishBegin();
        }
    }
    cmd(`rm -rf ${tarFile}`, start.dir);
    log(`${way} publish success!`);
};

//分析线路
var parseLine = function(){
    var items = {};
    var item = start = items.start = pub.start || {};
    //start.env = start.env || args.env;  //because nobox pub test
    start.rose = start.rose || args.rose || "pack";
    start.keyDir = start.keyDir || args.keyDir;
    start.puber = start.puber || args.puber || ua.user || ua.ip || "unknown";
    start.time = args.time || getDateTime();
    mid = pub.mid || args.mid;
    for(let m in mid){
        item.next = m;
        item = mid[m];
        item.rose = item.rose || "upload";
        if(item.rose=="pack"){
            for (let m2 in items) {
                items[m2].rose = "login";
            }
        }
        items[m] = item;
    }
    item.next = args.env;
    pub.rose = "deploy";
    pub.env = args.env;
    pub.start = null;
    pub.mid = null;
    args.show && log({start,mid,pub});
};

module.exports = function(_ua) {
    ua = _ua;
    args = getArgs("cmd", "env");
    isShow = args.show ? "--show" : "";

    cmdList = [];

    if (!args.env) {
        end("please select a environment before!");
    }
    config = ex.getConfig(args, ua);
    pub = config.pub || args.pub;
    if(!pub) {
        throw "please setting publish option 'pub' before!";
    }
    parseLine();
    args.currentBranch = cmd("git rev-parse --abbrev-ref HEAD", start.dir);

    if (!pub.dir) {
        throw "please setting option 'pub.dir' before!";
    }

    if(!args.parallel){
        pub.host = pub.ip || pub.domain;
        if(!pub.host) {
            throw "please setting option 'pub.ip or pub.domain' before!";
        }
    }
    args.show && log({config});
    start.rose=="pack" ? chkPubBefore() : startPub();
};