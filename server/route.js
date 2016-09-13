/**
 * 路由模块
 * Created by likaituan on 15/8/26.
 */

    var url = require("url");

    //路由解析
    exports.parse = function(req, parsers) {
        var uri = url.parse(req.url);
        var p,item;
        for(var parser of parsers){
            if(parser) {

                for (p in parser.items) {
                    item = parser.items[p];
                    if (uri.path.indexOf(p) == 0) {
                        return [parser, item];
                    }
                    if (uri.path + "/" == p) {
                        return [parser, item];
                    }
                }
            }
        }
        return [null,null];
    };