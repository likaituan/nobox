/**
 * 发版(服务端)
 */

var fs = require("fs");
var fs2 = require("../core/fs2");
var ex = require("./ex");
var start = require("./start");

module.exports = function(args, ops) {
    args.node = args.node || args.env;
    args.java = args.java || args.env;

    var dir = `${args.dir}/bin`;

    //step1 - stop node
    var pid = ex.getPid(["nobox","pub_server", args.port]);
    pid && ex.kill(pid);

    //step2 - delete old files
    fs.existsSync(dir) && fs2.rmdir(dir);

    //step3 - add new files
    fs.mkdirSync(dir);
    ex.unTar(`${args.dir}/bin.tar.gz`, dir);

    //step4 - run node
    args.cmd = "start";
    start(args, ops);

};