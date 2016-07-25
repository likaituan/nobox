var fs = require("fs");
var cmd = require("./cmd");

module.exports = function(args, ops) {
    var node = args.node || args.env;
    var java = args.java || args.env;

    console.log("port=", args.port, "dir=", args.dir, "env=", args.env);

    cmd.start();

    //step1 - stop node
    var pid = cmd.sync(`ps -aux | grep ${ops.pk.name} | grep start | grep port=${port} | awk '{print $2}'`);
    pid && cmd(`kill - 9 ${pid}`);

    cmd(`cd ${dir}`);

    //step2 - delete old files
    fs.existsSync("bin/") && cmd("rm - rf bin/");

    //step3 - add new files
    cmd("mkdir bin");
    cmd("tar -zxf bin.tar.gz -C bin/");

    cmd("cd bin/");

    //step4 - run node
    var exeFile = cmd.sync("npm bin -g") + `/${ops.pk.name}`;
    cmd(`nohup node ${exeFile} start node=${node} java=${java} port=${port} --save > 1.log 2>&1 &`);

    cmd.end();
};