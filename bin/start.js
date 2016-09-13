var server = require("../server/server");
var ex = require("./ex");

module.exports = function(args, ua) {
    var ops = ex.getConfig(args, ua);
    (args.show||args.s) && console.log(ops);
    if(!ops.static && !ops.remote && !ops.db){
        ops.static = {
            path: "/",
            dir: "./"
        };
    }
    server.init(ops);
};