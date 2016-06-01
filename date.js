/**
 * 日期相关的函数
 * Created by likaituan on 15/7/27.
 */

(function (req, exp) {
	"use strict";

    //解析日期
    exp.parseDate = function (date) {
        if (arguments.length == 3) {
            date = new Date(date, arguments[1], arguments[2]);
        } else if (typeof (date) == "string") {
            date = new Date(date.replace(/\-/g, "/"));
        } else if (typeof (date) == "number") {
            date = new Date(date);
        }
        return date;
    };

    //获取相差天数
    exp.getDiffDay = function(startDate, endDate){
        if(arguments.length==1){
            endDate = startDate;
            startDate = new Date();
        }
        var d1 = exp.parseDate(startDate);
        var d2 = exp.parseDate(endDate);
        d1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
        d2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
        return (d2-d1)/86400000;
    };


    //获取当前时间
    exp.now = function() {
        return exp.formatTime(new Date(Date.now()+28800000)); //加8个小时
    };

    //格式化时间（YYYY-MM-DD hh:mm:ss形式）
    exp.formatTime = function(date) {
        return date.toISOString().replace("T"," ").replace(/\..+$/,"");
    };

})(require, exports);