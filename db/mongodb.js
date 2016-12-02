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
    exp.init = function (callback) {
        if (exp.isInstalled) {
            var port = exp.config.port || 27017;
            var userInfo = exp.config.userName&&exp.config.password ? exp.config.userName +":"+exp.config.password+"@" : "";
            mongodb.connect(`mongodb://${userInfo}${exp.config.ip}:${port}/${exp.config.dbName}`, function (err, db) {
                if (err) {
                    console.log(err.message);
                    console.log(`warning: your mongodb server was not installed or not started, please input 'mongod' to run in command line`);
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

    //操作结果
    var operateResult = function(callback){
        return function(err, result){
            if(err) {
                callback({message: err+":"+result});
            }else{
                callback({code:0});
            }
        }
    };


    /*=====================批量操作====================*/

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
            if(err){
                callback({code:500});
            }else {
                if (doc) {
                    arr.push(doc);
                } else {
                    callback({data: arr});
                }
            }
        });
    };

    //添加
    exp.add = function(tbName, params, callback) {
        var tb = exp.db.collection(tbName);
        tb.insertOne(params, function(err, result) {
            callback({message:"add success!"});
        });
    };

    //删除
    exp.remove = function(tbName, params, callback) {
        var tb = exp.db.collection(tbName);
        tb.deleteMany(params, function(err, result) {
            callback({message:"remove success!"});
        });
    };

    //更新单个
    exp.update = function (tbName, ops, callback) {
        var tb = exp.db.collection(tbName);
        var query = JSON.parse(ops.query);
        var update = JSON.parse(ops.update);
        var newCallback = operateResult(callback);
        tb.update(query,{$set:update}, newCallback);
    };


    /*==============单个操作================*/


    //查找单个
    exp.findOne = function (tbName, params, callback){
        var tb = exp.db.collection(tbName);
        tb.findOne(params, function(err, result){
            if(err) {
                callback({message: err+":"+result});
            }else{
                callback(result);
            }
        });
    };

    //添加单个
    exp.addOne = function(tbName, params, callback) {
        log({tbName,params});
        var tb = exp.db.collection(tbName);
        var newCallback = operateResult(callback);
        tb.insertOne(params, newCallback);
    };

    //删除单个
    exp.removeOne = function(tbName, params, callback) {
        //params = JSON.parse(JSON.stringify(params)); //有bug,先这样
        var tb = exp.db.collection(tbName);
        var newCallback = operateResult(callback);
        tb.deleteOne(params, newCallback);
    };

})(require, exports);