/**
 * 路由模块
 * Created by likaituan on 15/8/26.
 */

    var url = require("url");

    //路由解析
    exports.parse = function(req, parsers) {
        var uri = url.parse(req.url);
        var i;
        var p;
        var parser;
        var item;
        for(i in parsers){
            parser = parsers[i];
            for (p in parser.items) {
                item = parser.items[p];
                if (uri.path.indexOf(p) == 0) {
                    return [parser, item];
                }
                if (uri.path + "/"== p) {
                    return [parser, item];
                }
            }
        }
        return [null,null];

        /*


        for (var path in remoteServer.paths) {
            if (uri.path.indexOf(path) == 0) {
                return remoteServer.parse(Req, Res, remoteServer.paths[path]);
            }
        }
        for (var path in staticServer.paths) {
            if (uri.path.indexOf(path) == 0) {
                return staticServer.parse(Req, Res, staticServer.paths[path]);
            }
            if ((uri.path + "/") == (path)) {
                return staticServer.parse(Req, Res, staticServer.paths[path]);
            }
        }
        for (var path in binary.paths) {
            if (uri.path.indexOf(path) == 0) {
                return binary.parse(Req, Res, binary.paths[path]);
            }
            if ((uri.path + "/") == (path)) {
                return binary.parse(Req, Res, binary.paths[path]);
            }
        }*/

    };