/**
  * 获取GET或POST请求的参数
  * Created by likaituan on 15/8/27.
  */


var qs = require("querystring");
var url = require("url");
var multipart =  require("./multipart");

//获取参数
exports.getParams = function(req, callback){
    if(req.isMultipart){
        return multipart.parseFormData(req, callback);
    }

    var data = {};
    if(req.method == "GET"){
        data.fields = url.parse(req.url,true).query;
        callback(data);
    }
    else if(req.method=="POST") {
        var postdata = "";
        req.addListener("data", function (postchunk) {
            postdata += postchunk;
        });
        req.addListener("end", function () {
            var fields = qs.parse(postdata);
            data.fields = {};
            for (var k in fields) {
                data.fields[k] = typeof(fields[k]) == "string" ? fields[k].trim() : fields[k];  //空格过滤
            }
            callback(data);
        });
    }else{
        console.log(`目前nobox不支持${req.method}请求方式`);
        //callback(data);
    }
};