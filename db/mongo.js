    /**
     * 数据库API
     */

(function(req, exp) {
    "use strict";
    var mongodb = req("mongodb").MongoClient;

    exp.db = null;
    exp.config = {};

    //连接
    exp.init = function (dbName, callback) {
        var port = exp.config.port || 27017;
        mongodb.connect(`mongodb://${exp.config.ip}:${port}/${exp.config.dbName}`, function(err, db){
            if (err) {
                callback(0);
            }else{
                exp.db = db;
                callback(db);
            }
            //db.close();
        });
    };

    //查找
    exp.find = function(tbName, cond, callback){
        if(arguments.length==2){
            callback = cond;
            cond = null;
        }
        var arr = [];
        var tb = exp.db();
        tb.find().each(function(err, doc){
            if(doc) {
                arr.push(doc);
            }else {
                callback(arr);
            }
        });
    };

})(require, exports);