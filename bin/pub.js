/**
 * 发版客户端脚本
 */

var fs = require("fs");
var cp = require("child_process");
var ex = require("./ex");

var exp = {};
var args = {};
var ops = {};
var config = {};
var pub;

//cmd对外接口
var cmd = function(cmdExp) {
    exp.cmdList.push(cmdExp);
};

//上传
var doPub = function(){
    config.onPubBefore && config.onPubBefore(cmd);
    exp.cmdList.length>0 ? doCmd() : doPub2();
};

//执行单个命令
var doCmd = function() {
    var cmdExp = exp.cmdList.shift();
    if(cmdExp) {
        var args = cmdExp.split(/\s+/g);
        console.log(args);
        const ls = cp.spawn(args.shift(), args, {shell: true});

        ls.stdout.on('data', (data) => {
            console.log(data.toString());
        });

        ls.stderr.on('data', (data) => {
            process.stderr.write(data);
        });

        ls.on('close', (code) => {
            if (code == 0) {
                doCmd();
            } else {
                console.log("pub before fail!")
            }
        });
    }else{
        console.log("pub before success!");
        doPub2();
    }
};

//上传2
var doPub2 = function() {
    var user = pub.remoteUser || "root";
    var port = pub.remotePort || config.port;
    var tarFile = "bin.tar.gz";

    cp.exec(`tar -zcf ${tarFile} ${pub.tarSource}`, function (err, stdout, stderr) {
        var sshArgs = "";
        var keyPath = `sshkeys/${args.env}.key`;
        if (fs.existsSync(keyPath)) {
            sshArgs = `-i ${keyPath}`;
        }
        ex.showTip("pack", err, stderr) && cp.exec(`scp ${sshArgs} ${tarFile} ${user}@${exp.ip}:${exp.dir}/bin.tar.gz`, function (err, stdout, stderr) {
            cp.execSync(`rm -rf ${tarFile}`);
            if (ex.showTip("upload", err, stderr)) {
                var sshCmd = ops.platform == "win32"
                    ? `ssh ${sshArgs} ${user}@${exp.ip} "sh \`npm root -g\`/nobox/bin/pub_server.sh ${port} ${exp.dir} ${args.env}"`
                    : `ssh ${sshArgs} ${user}@${exp.ip} "sh \\\`npm root -g\\\`/nobox/bin/pub_server.sh ${port} ${exp.dir} ${args.env}"`;
                //console.log(sshCmd);
                cp.exec(sshCmd, function (err, stdout, stderr) {
                    ex.showTip("publish", err, stderr);
                });
            }
        });
    });
};

module.exports = function(_args, _ops) {
    args = _args;
    ops = _ops;

    exp.cmdList = [];
    args.env = args.more[0];
    try {
        args.currentBranch = cp.execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
    }catch(e){}
    config = ex.getConfig(args, ops);

    if (args.env) {
        pub = typeof(config.pub) == "function" ? config.pub(args) : config.pub;
        pub = pub || {};
        exp.ip = pub.remoteIp;
        exp.dir = pub.remoteDir; //暂时写死
        if (exp.ip && exp.dir) {
            doPub(args,config);
        } else {
            console.log("please setting publish option before!");
        }
    } else {
        console.log("please select a environment before!");
    }
};