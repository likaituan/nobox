/**
 * 命令列表
 * Created by likaituan on 16/7/21.
 */

var cp = require("child_process");

module.exports = {
    //更新
    update: function(args, ops){
        console.log("now is updating, please wait a moment...");
        var cmd = `${ops.sudo}${ops.npm} install -g ${ops.engine.name}`;
        if(args.more && args.more.length>0){
            cmd += `@${args.more[0]}`;
        }
        var stdout = cp.execSync(cmd).toString();
        console.log(stdout);
    }
};