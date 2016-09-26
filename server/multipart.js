/**
 * 二进制表单数据处理
 * Created by likaituan on 16/9/22.
 */

var Stream = require('stream');
var {byteFormat} = require("ifun");

var getFileField = function(file){
    var field = {};
    field.filename = file.filename;
    field.contentType = file.contentType;
    field.content = "[binary data]";
    field.size = byteFormat(file.byte);
    return field;
};

//获取Form提交的数据
exports.getFormData = function(req, callback){
    var bstr = "";
    var stream = new Stream.PassThrough();

    req.addListener("data", function(data){
        bstr += data.toString("binary");
        stream.write(data);
    });
    req.addListener("end", function(){
        stream.end();
        callback({bstr,stream});
    });
};

//解析表单数据
exports.parseFormData = function(req, callback){
    exports.getFormData(req, function(data) {
        data.fields = {};
        data.files = {};
        var spFlag = req.headers["content-type"].split("boundary=")[1];

        data.bstr.split(spFlag).forEach( bstr => {
            bstr.replace(/\bname=\"([^"]+)\"\s+(\S+)/, function (_, key, val) {
                key = new Buffer(key, "binary").toString("utf-8");
                val = new Buffer(val, "binary").toString("utf-8");
                data.fields[key] = val;
            });
            bstr.replace(/\bname="([^"]+)"; filename="([^"]+)"\s+Content-Type: (\S+)\s+([\s\S]+)\r\n--/, function (_, name, filename, contentType, content) {
                content = new Buffer(content, "binary");
                data.files[name] = {
                    filename: new Buffer(filename, "binary").toString("utf-8"),
                    contentType: new Buffer(contentType, "binary").toString("utf-8"),
                    content: content,
                    byte: content.length
                };
                data.fields[name] = getFileField(data.files[name]);
            });
        });
        callback(data);
    });
};