/**
  * 获取GET或POST请求的参数
  * Created by likaituan on 15/8/27.
  */


var qs = require("querystring");
var url = require("url");
var multipart =  require("./multipart");

//字段过滤
var parseFields = function(_fields){
    var fields = {};
    for (var k in _fields) {
        fields[k] = typeof(_fields[k]) == "string" ? _fields[k].trim() : _fields[k];  //空格过滤
    }
    return fields;
};

//获取参数
exports.getParams = function(req, callback){
    if(req.isMultipart){
        return multipart.parseFormData(req, callback);
    }

    var data = {};
    if(req.method == "GET"){
        var fields = url.parse(req.url,true).query;
        data.fields = parseFields(fields);
        callback(data);
    }
    else if(req.method=="POST") {
        var postdata = "";
        req.addListener("data", function (postchunk) {
            postdata += postchunk;
        });
        req.addListener("end", function () {
            var fields = qs.parse(postdata);
            data.fields = parseFields(fields);
            callback(data);
        });
    }else{
        console.log(`目前nobox不支持${req.method}请求方式`);
        //callback(data);
    }
};