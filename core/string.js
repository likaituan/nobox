/**
 * 字符串相关的函数
 * Created by likaituan on 15/7/27.
 */

(function (req, exp) {
    var ex = require("./ex");

    //字符串格式化
    exp.format = function (str, obj) {
        if(arguments.length==1){
            return str;
        }else if(arguments.length==2 && ex.isPlainObject(obj)){
            return str.replace(/\{(\w+)\}/g, function (_, key) {
                return obj[key];
            });
        }else{
            var arr = [].slice.call(arguments, 1);
            return str.replace(/\{(\d+)\}/g, function (_, n) {
                return arr[n];
            });
        }
    };

    //字符串格式化输出
    exp.log = function () {
        var args = [].slice.call(arguments);
        var str = this.format.apply(this, args);
        console.log(str);
    };

    //根据指定的分隔符截成两半
    exp.split2 = function (str, flag) {
        var a = str.split(flag);
        var ret = [a.shift()];
        a.length > 0 && ret.push(a.join(flag));
        return ret;
    };

})(require, exports);