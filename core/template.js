/**
 * seekTemplate - 前端轻量级模板插件
 * Created by likaituan on 14/8/18.
 */

(function (req, exp) {
	"use strict";
    var $ = {};

	//生成JS代码
	exp.getJsCode= function (tmpCode) {
		tmpCode = tmpCode.replace(/\r\n|\r|\n/g, "");
		var jscode = [];
		jscode.push('var buf = [];');
		var R = RegExp;
		var jsRe = /<%([\s\S]+?)%>/;

		//添加HTML代码
		var addHTML = function (s) {
			s = s.replace(/【/g, "{").replace(/】/g, "}");
			s = s.replace(/'/g, "\\'");
			jscode.push("buf.push('" + s + "');");
		};

		//添加JS代码
		var addJs = function (ss) {
			ss = ss.replace(/\$\.write\((.+?)\);?/g, "buf.push($1);");
			ss = ss.replace(/^\s*=\s*(\w+)\s*$/g, "buf.push($1);");
			jscode.push(ss);
		};

		//然后编译JS
		var compileJs = function (code) {
			if (jsRe.test(code)) {
				var a = [R.leftContext, R.$1, R.rightContext];
				a[0] && addHTML(a[0]);
				a[1] && addJs(a[1]);
				a[2] && compileJs(a[2]);
			} else {
				addHTML(code);
			}
		};

		compileJs(tmpCode);

		jscode.push('return buf.join("");');
		jscode = jscode.join("\n");
		return jscode;
	};


	//获得编译函数
	exp.getFun = function (tplCode) {
		var jscode = exp.getJsCode(tplCode);
		return new Function("$", jscode);
	};

	//编译函数
	exp.compileFun = function (tplFun) {
		return function (data) {
			return tplFun.call(data, $);
		};
	};

	//直接编译模板代码
	exp.compile = function (tplCode) {
		var jscode = exp.getJsCode(tplCode);
		//console.log(jscode);
		var templateFun = new Function("$", jscode);
		return exp.compileFun(templateFun);
	};

})(require, exports);