/**
 * 数据库API
 */

(function(req, exp) {
    "use strict";
    var assert = require('assert');
    var mongodb = {};

    try {
        mongodb = req("mongodb").MongoClient;
        exp.isInstalled = true;
    } catch (e) {
        exp.isInstalled = false;
    }

    exp.db = null;
    exp.config = {};

    //连接
    exp.init_bak = function (callback) {
        if (exp.isInstalled) {
            var port = exp.config.port || 27017;
            mongodb.connect(`mongodb://${exp.config.ip}:${port}/${exp.config.dbName}`, function (err, db) {
                if (err) {
                    console.log(err.message);
                    console.log(`warning: your mongodb server was not installed or not started`);
                    callback(0);
                } else {
                    exp.db = db;
                    console.log(`MongoDB Is Running At ${exp.config.ip}:${port} by ${exp.config.dbName}`);
                    callback(exp);
                }
                //db.close();
            });
        } else {
            console.log("warning: you was not installed mongodb package!");
            callback(0);
        }
    };

    exp.init = function (callback) {
        if (exp.isInstalled) {
            var port = exp.config.port || 27017;
            var userInfo = exp.config.userName&&exp.config.password ? exp.config.userName +":"+exp.config.password+"@":"";
            mongodb.connect(`mongodb://${userInfo}${exp.config.ip}:${port}/${exp.config.dbName}`, function (err, db) {
                if (err) {
                    console.log(err.message);
                    console.log(`warning: your mongodb server was not installed or not started`);
                    callback(0);
                } else {
                    exp.db = db;
                    console.log(`MongoDB Is Running At ${exp.config.ip}:${port} by ${exp.config.dbName}`);
                    callback(exp);
                }
                //db.close();
            });
        } else {
            console.log("warning: you was not installed mongodb package!");
            callback(0);
        }
    };

    //查找
    exp.find = function (tbName, cond, callback) {
        if (arguments.length == 2) {
            callback = cond;
            cond = null;
        }
        var arr = [];
        var tb = exp.db.collection(tbName);
        tb.find().each(function (err, doc) {
            assert.equal(err, null);
            if (doc) {
                arr.push(doc);
            } else {
                callback({data: arr});
            }
        });
    };

    //查找一条
    exp.findOne_bak = function (tbName, cond, callback){
        exp.find(tbName, cond, function(data){
            callback({data: data[0]});
        }).limit(1);
    };

    //查找一条
    exp.findOne = function (tbName, params, callback){
        var tb = exp.db.collection(tbName);
        tb.findOne(params,function (err,item) {
            assert.equal(err, null);
            if(item){
                callback({data:item});
            }else{
                callback({result:null});
            }
        });
    };

    //保存
    exp.save = function(tbName, params, callback) {
        var tb = exp.db.collection(tbName);
        tb.insertOne(params, function(err, result) {
            assert.equal(err, null);
            //console.log("Inserted a document into the restaurants collection.");
            callback({message:"add success!"});
        });
    };

    //删除
    exp.remove = function(tbName, params, callback) {
        var tb = exp.db.collection(tbName);
        tb.deleteMany(params, function(err, result) {
            assert.equal(err, null);
            callback({message:"remove success!"});
        });
    };

    //删除单个
    exp.removeOne = function(tbName, params, callback) {
        var tb = exp.db.collection(tbName);
        params = JSON.parse(JSON.stringify(params));
        tb.deleteOne(params, function(err, result) {
            assert.equal(err, null);
            callback({message:"remove success!"});
        });
    };

})(require, exports);