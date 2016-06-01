/**
  * 获取GET或POST请求的参数
  * Created by likaituan on 15/8/27.
  */

~function(req,exp){
	"use strict";
	var qs = req("querystring");
	var url = req("url");

	//获取参数
    exp.getParams = function(Req, Res, callback){
        if(Req.method == "OPTIONS"){
            Res.end('{"code":-99,"message":"取不到数据"}');
            //callback({});
        }else if(Req.method == "GET"){
            var params = url.parse(Req.url,true).query;
            callback(params);
        }
        else if(Req.method=="POST") {
            var postdata = "";
            Req.addListener("data", function (postchunk) {
                postdata += postchunk;
            });
            Req.addListener("end", function () {
                var params = qs.parse(postdata);
                callback(params);
            });
        }else{
            console.log(`目前nova不支持${Req.method}请求方式`);
            //callback({});
        }
    };

}(require,exports);
