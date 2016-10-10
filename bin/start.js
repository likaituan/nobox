var server = require("../server/server");
var ex = require("./ex");
var {getArgs,log} = require("ifun");

module.exports = function(ua) {
    var args = getArgs("cmd");
    var ops = ex.getConfig(args, ua);
    (args.show||args.s) && log(ops);
    if(!ops.static && !ops.remote && !ops.db){
        ops.static = {
            path: "/",
            dir: "./"
        };
    }
    server.init(ops);
};