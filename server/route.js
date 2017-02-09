/**
 * 路由模块
 * Created by likaituan on 15/8/26.
 */

    var url = require("url");

    //路由解析
    exports.parse = function(req, parsers) {
        var uri = url.parse(req.url);
        for(var parser of parsers){
            if(parser) {
                for (var item of parser.items) {
                    if(typeof(item.path)=="object" && item.path.test(uri.path)){
                        return [parser, item];
                    }
                    if (uri.path.indexOf(item.path) == 0) {
                        return [parser, item];
                    }
                    if (uri.path + "/" == item.path) {
                        return [parser, item];
                    }
                }
            }
        }
        return [null,null];
    };