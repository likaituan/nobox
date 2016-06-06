//JAVA环境配置

var list = {
    //本地环境
    localhost: {
        ip:"127.0.0.1",
        port: 8081
    },
    //测试环境exit
    test:{
        ip: "115.28.25.240",
        port: 8081
    },
	test2:{
		ip: "139.129.38.160",
		port: 8081
	},
    //生产环境
    online: {
        //ip: "115.28.200.43",
        ip: "127.0.0.1",
        port:8001
    },
    //自强
    ziqiang: {
        ip: "10.0.0.116",
        //ip:"172.20.250.249",
        port:8081
    },
    //于淼
    yumiao: {
        ip: "192.168.1.64",
        port:8081
    },
	//王浩
	wanghao: {
		ip: "192.168.1.38",
		port:8081
	},
	//志勇
	zhiyong: {
	ip: "172.168.1.101",
		port:8081
	}
};

var env = "test";
process.argv.slice(2).forEach(function(item){
    if(item!="bin" && /^\d+$/i.test(item)==false) {
        env = item;
    }
});
var currentEnv = list[env];

module.exports = {
    ip: currentEnv.ip,
    port: currentEnv.port,
    path: "/java"
};
