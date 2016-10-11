var server = require("../server/server");
var ex = require("./ex");
var {getArgs,log} = require("ifun");

module.exports = function(ua, _args) {
    var args = _args || getArgs("cmd");
    var ops = ex.getConfig(args, ua);
    (args.show||args.s) && log({config:ops});
    if(!ops.static && !ops.remote && !ops.db){
        ops.static = {
            path: "/",
            dir: "./"
        };
    }
    server.init(ops);
};