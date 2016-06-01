var net = require('net');
var port = 7003;
var host = '127.0.0.1';

var client= new net.Socket();
client.setEncoding('binary');
//连接到服务端
client.connect(port,host,function(){

		    client.write('hello my client');

			});

client.on('data',function(data){
		    console.log('recv data:'+ data);

			});
client.on('error',function(error){

		    console.log('error:'+error);
			    client.destory();

				});
client.on('close',function(){

		    console.log('Connection closed');


			});
