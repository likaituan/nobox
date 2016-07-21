/**
 * 命令列表
 * Created by likaituan on 16/7/21.
 */

var cp = require("child_process");
var ex = require("./ex");

module.exports = {
    //重装
    install: function(args, ops){
        console.log("now is reinstall, please wait a moment...");
        cp.exec(`${ops.sudo}${ops.inpm} install -g ${ops.package.name}`, function callback(error, stdout, stderr) {
            console.log(stdout);
        });
    },
    //更新
    update: function(args, ops){
        console.log("now is updating, please wait a moment...");
        cp.exec(`${ops.sudo}${ops.inpm} update -g ${ops.package.name}`, function (error, stdout, stderr) {
            console.log(stdout);
        });
        /*
        ex.spawn(`${ops.sudo}${ops.inpm} update -g ${ops.package.name}`, function (code) {
            console.log(code==0 ? "update success!" : "update fail!");
        });
        */
    }
};