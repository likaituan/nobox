~function(req,exp){	
	"use strict";
	var mongodb = req('mongodb');
	var server = new mongodb.Server("localhost",27017,{safe:true});
	var db = new mongodb.Db("bank",server,{});

	//成功处理
	var suc = {
		data:function(_data){
			return {code:0, data:_data};
		}
	};

	//错误处理
	var err = {
		message:function(_message){
			return {code:-1, message:_message};
		}
	};

	//解析
	exp.parse = function(fm,params,callback){
		var file = fm[0];
		var m = fm[1];

		db.open(function(error,client){
			var oo = req("../../services/"+file);
			var o = oo[m](params);
			o.res(db,suc,err,callback);
		});
	};

}(require,exports);
