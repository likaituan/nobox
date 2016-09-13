/**
 * 表单验证模块
 * Created by likaituan on 15/9/11.
 */

(function(req, exp) {
    "use strict";
    var re = req("../core/re");
    var str = req("../core/string");
    var date = req("../core/date");

    var Rules = req("./rules");

    //规则提示
    exp.tips = {
        cn: req("./tip/cn"),
        en: req("./tip/en")
    };

    exp.tip = exp.tips.cn;

    /**
     * 检查规则
     * @param params 参数列表
     * @param chk_params 检测参数列表
     * @param rules 规则列表
     * @returns {message|true}
     */
    exports.chk = function(params, chk_params, rules){
        var title, rule;
        for(var key in chk_params) {
            var o = chk_params[key];
            if(typeof o=="object"){
                title = o.title;
                rule = o.rule;
            }else{
                title = o;
                rule = key;
            }
            title = `"${title}"`;

            //新加快速非空检测
            if (rule=="no-empty") {
                if(params[key] == "") {
                    return [key, str.format(exp.tip.empty, title)];
                }
            }else {

                var chkItems = rules[rule] || Rules[rule];
                if (!chkItems) {
                    throw str.format("the rule {0} is not find", rule);
                }
                if (typeof(chkItems) == "function") {
                    chkItems = chkItems(params);
                }
                if (typeof chkItems != "object") {
                    if (typeof chkItems == "string") {
                        chkItems = chkItems.replace(/\{0\}/g, title);
                    }
                    if (chkItems !== true) {
                        return [key, chkItems];
                    }
                }
                var val = params[key];
                /*
                 var noRequired = chkItems.hasOwnProperty("required") && chkItems.required==0;
                 if (noRequired && val == "") {
                 continue;
                 } else if (!noRequired && val == "") {
                 return str.format(chkItems.empty||exp.tip.empty, title);
                 }
                 */
                if (val == "" && chkItems.chk_empty !== false) {
                    return [key, str.format(chkItems.empty_title || exp.tip.empty, title)];
                }
                for (var k in chkItems) {
                    var v = exp.chkItem(title, val, k, chkItems[k], chkItems, params);
                    if (v !== true) {
                        return [key, v];
                    }
                }
            }
        }
        return true;
    };

    /**
     * 检查某项
     * @param title 标题
     * @param val 值
     * @param key 检查项
     * @param n 检查项值
     * @returns {message|true}
     */
    exp.chkItem = function(title, val, key, n, o, params){
        var tip = exp.tip;
        //格式
        if(key=="number" && re.number.test(val)===false){
            return str.format(tip.number, title);
        }
        if(key=="chinese" && re.chinese.test(val)===false){
            return str.format(tip.chinese, title);
        }
        if(key=="number_or_letter" && re.number_or_letter.test(val)===false){
            return str.format(tip.number_or_letter, title);
        }
        if(key=="number_and_letter" && re.number_and_letter.test(val)===false){
            return str.format(tip.number_and_letter, title);
        }
        if(key=="re" && n.test(val)===false){
            return str.format(o.re_title||tip.format, title);
        }

        //数字大小
        if(key=="more_than" && val<=n){
            return str.format(tip.more_than, title, n);
        }
        if(key=="less_than" && val>=n){
            return str.format(tip.less_than, title, n);
        }
        if(key=="min" && val<n){
            return str.format(tip.min, title, n, o.unit||"");
        }
        if(key=="max" && val>n){
            return str.format(tip.max, title, n, o.unit||"");
        }
        if(key=="between" && (val.length<n[0]||val.length>n[1]) ){
            return str.format(tip.between, title, n[0], n[1]);
        }

        //数字位数
        if(key=="bit"){
            if(typeof(n)=="number" && val.length!=n){
                return str.format(tip.bit, title);
            }
            if(typeof(n)=="string" && /^(\d+)\-(\d+)$/.test(n)){
                var minBit = RegExp.$1;
                var maxBit = RegExp.$2;
                if(val.length<minBit || val.length>maxBit) {
                    return str.format(tip.bit, title);
                }
            }
            //数组
            if(typeof(n)=="object"){
                for(var i in n) {
                    if(val.length==n[i]){
                        return true;
                    }
                }
                return str.format(tip.bit, title);
            }
        }
        if(key=="minBit" && val.length<n){
            return str.format(tip.minBit, title, n);
        }
        if(key=="maxBit" && val.length>n){
            return str.format(tip.maxBit, title, n);
        }

        //字符串长度
        if(key=="len" && val.length<n){
            return str.format(tip.len, title, n);
        }
        if(key=="minLen" && val.length<n){
            return str.format(tip.minLen, title, n, o.unit||"");
        }
        if(key=="maxLen" && val.length>n){
            return str.format(tip.maxLen, title, n, o.unit||"");
        }

        //字节长度
        if(key=="minByte" && val.length<n){
            return str.format(tip.minByte, title, n/2, n);
        }
        if(key=="maxByte" && val.length>n){
            return str.format(tip.maxByte, title, n/2, n);
        }

        //日期天数
        if(key=="minDate" || key=="maxDate"){
            var dayCount = date.getDiffDay(val)+1;
        }
        if(key=="minDate" && dayCount<n){
            return str.format(tip.minDate, title, n);
        }
        if(key=="maxDate" && dayCount>n){
            return str.format(tip.maxDate, title, n);
        }

        //是否一致
        if(key=="diff" && val!=params[o.diff]){
            return tip.diff;
        }

        return true;
    };

})(require, exports);