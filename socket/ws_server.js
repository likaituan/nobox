var cons = new Array();
var ws = require('ws').Server;
var server = new ws({host:"192.168.1.3",port:8888});
server.on('connection',function(ws){
		  console.log('new connection founded successfully');
		    cons.push(ws);
			  ws.on('message',function(data){
				      for(var i=0;i<cons.length;i++){
					          cons[i].send(data);
							      }
								    });
			    ws.on('close',function(){
					    for(var i=0;i<cons.length;i++){
						       if(cons[i] == ws) cons.splice(i,1);
							       }
								     });
				});
console.log('websocket-server running...');
