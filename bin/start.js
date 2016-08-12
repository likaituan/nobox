var server = require("../server/core");
var ex = require("./ex");

module.exports = function(args, ops) {
    var hasPath = false;
    var config = ex.getConfig(args, ops);
    server.config = config;
    hasPath = !!server.config.binary;//暂时
    if (config.hasFile) {
        if (config.static) {
            hasPath = true;
            if (config.static.items) {
                config.static.items.forEach(server.addStatic);
            } else {
                server.addStatic(config.static);
            }
        }
        if (config.remote) {
            hasPath = true;
            if (config.remote.items) {
                if(config.db){
                    config.db.type = "mongodb";
                    config.remote.items.push(config.db);
                }
                config.remote.items.forEach(function (item) {
                    for (var k in config.remote) {
                        if (k !== "items" && item[k] === undefined) {
                            item[k] = config.remote[k];
                        }
                    }
                    server.addRemote(item);
                });
            } else {
                server.addRemote(config.remote);
            }
        }
        if (config.db) {
            hasPath = true;
            server.addDb(config.db);
        }
        server.gzip = config.gzip;
        server.forever = config.forever;
        server.startTip = config.startTip;
        server.port = config.port;
        server.start();
    } else if (args.static) {
        if(typeof args.static=="string"){
            args.static = {
                path: "/",
                dir: args.static
            };
        }
        hasPath = true;
        if (args.seekjs) {
            server.addStatic({
                path: "/seekjs/",
                dir: args.seekjs
            });
        }
        server.addStatic(args.static);
        server.port = args.port || 80;
        server.start();
    }
    if (!hasPath) {
        throw `sorry, please set path parameter on command line or setting a '${ops.pk.name}.config.js' file on current directory!`;
    }
    args.open && cp.execSync(`open http://localhost:${server.port}`);
    args.show && console.log("args=",args,"\n\nops=",ops,"\n\nconfig=",config);
    args.show && console.log(server);
};