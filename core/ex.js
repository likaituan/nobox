/**
 * 一些常用的功能
 */

    var url = require("url");
    var qs = require("querystring");
    var os = require("os");


    //判断是否纯对象
    exports.isPlainObject = function(v){
        return typeof(v)=="object" && !Array.isArray(v);
    };


    //获取IP
    exports.getIp = function(){
        try{
            var ips = os.networkInterfaces();
            for(var k in ips) {
                if(/en|eth/.test(k)) {
                    var a = ips[k];
                    for (var j = 0; j < a.length; j++) {
                        var o = a[j];
                        if (o.family == "IPv4" && o.internal === false) {
                            return o.address;
                        }
                    }
                }
            }
        }catch(e){
            return "localhost";
        }
    };

    //获取参数
    exports.getParams = function(req, callback){
		console.log(req.method);
        if(req.method == "GET"){
            var params = url.parse(req.url,true).query;
            callback(params);
        }
        else if(req.method=="POST") {
            postdata = "";
			console.log("listen......");
            req.addListener("data", function (postchunk) {
                postdata += postchunk;
            });
            req.addListener("end", function () {
					console.log("listen2...");
                var params = qs.parse(postdata);
				console.log("params=",params);
                callback(params);
            });
        }
    };
