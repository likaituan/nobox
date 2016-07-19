/**
 * 数据库API
 */

(function(req, exp) {
    "use strict";
    var assert = require('assert');
    var mongodb = {};

    exp.isInstalled = false;

    try{
        mongodb = req("mongodb").MongoClient;
        exp.isInstalled = true;
    }catch(e){
        console.log("sorry, you was not installed mongodb");
    }

    exp.db = null;
    exp.config = {};

    //连接
    exp.init = function (callback) {
        if(exp.isInstalled) {
            var port = exp.config.port || 27017;
            mongodb.connect(`mongodb://${exp.config.ip}:${port}/${exp.config.dbName}`, function (err, db) {
                if (err) {
                    callback(0);
                } else {
                    exp.db = db;
                    console.log(`MongoDB Is Running At ${exp.config.ip}:${port} by ${exp.config.dbName}`);
                    callback(exp);
                }
                //db.close();
            });
        }else{
            console.log("sorry, please start your mongoDB before!");
        }
    };

    //查找
    exp.find = function(tbName, cond, callback){
        if(arguments.length==2){
            callback = cond;
            cond = null;
        }
        var arr = [];
        var tb = exp.db.collection(tbName);
        tb.find().each(function(err, doc){
            assert.equal(err, null);
            if(doc) {
                arr.push(doc);
            }else {
                callback(arr);
            }
        });
    };

    //保存
    exp.save = function(tbName, params, callback) {
        var tb = exp.db.collection(tbName);
        tb.insertOne(params, function(err, result) {
            assert.equal(err, null);
            console.log("Inserted a document into the restaurants collection.");
            callback(params);
        });
    };

})(require, exports);