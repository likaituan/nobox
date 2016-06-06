#!/usr/bin/env node

var fs = require("fs");
var os = require("os");
var cp = require("child_process");
var server = require("../http/core");
var ex = require("../core/ex");
var pk = require("../package.json");

var currentOs = os.platform();
var argv = process.argv.slice(2);
var cmd = argv.shift();
var ip = ex.getIp();

//启动
if(cmd=="start") {
    var currentPath = process.cwd() + "/";
    var configFile = `${currentPath}${pk.name}.config.js`;

	var hasPath = false;
	var args = {};
    args.ip = ip;
	argv.forEach(function(kv){
		kv = kv.split("=");
		var k = kv[0];
		var v = kv[1];
		if(kv.length==2){
			args[k] = v;
		}else{
			args[k] = true;
		}
	});

    var hasFile = fs.existsSync(configFile);
	if(hasFile) {
        var config = require(configFile);
		if(typeof config=="function"){
			config = config(args);
		}
       	if(config.static){
			hasPath = true;
			if(config.static.items) {
				config.static.items.forEach(server.addStatic);
			}else{
				server.addStatic(config.static);
			}
		}
        if(config.remote){
			hasPath = true;
			server.addRemote(config.remote);
		}
		if(config.db){
			hasPath = true;
			server.addDb(config.db);
		}

        server.crossDomain = config.crossDomain;
        server.startTip = config.startTip;
        server.port = config.port;
        server.start();
    }else if (args.path) {
		hasPath = true;
        server.addStatic({
            path: "/",
            dir: args.path
        });
        server.port = args.port || 80;
        server.start();
	}

	if(hasPath) {
        args.open && cp.execSync('open http://localhost:' + server.port);
    }else{
		console.log(`sorry, please set path parameter or setting a '${pk.name}.config.js' file on current directory!`);
	}

//更新
}else if(cmd=="update") {
	console.log("now is updating, please wait a moment...");
    var updateCmd = currentOs=="win32" ? `npm update -g ${pk.name}` : `sudo npm update -g ${pk.name}`;
	cp.exec(updateCmd, function callback(error, stdout, stderr) {
		console.log(stdout);
	});

//查看版本
}else if(cmd=="-v"){
    console.log(pk.version);

}else{
    console.log(`welcome to ${pk.name}, ${pk.name} current version is ${pk.version}!`);
}