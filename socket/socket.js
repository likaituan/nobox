var net = require('net');

var sockets = [];
var name_map = new Array();
var chuck_quotes = [
    "There used to be a street named after Chuck Norris, but it was changed because nobody crosses Chuck Norris and lives.",
	    "Chuck Norris died 20 years ago, Death just hasn't built up the courage to tell him yet.",
		    "Chuck Norris has already been to Mars; that's why there are no signs of life.",
			    "Some magicians can walk on water, Chuck Norris can swim through land.",
				    "Chuck Norris and Superman once fought each other on a bet. The loser had to start wearing his underwear on the outside of his pants."
					]

					function get_username(socket) {
						    var name = socket.remoteAddress;
							    for (var k in name_map) {
									        if (name_map[k] == socket) {
												            name = k;
															        }
											    }
								    return name;
					}

function delete_user(socket) {
	    var old_name = get_username(socket);
		    if (old_name != null) {
				        delete(name_map[old_name]);
						    }
}

function send_to_all(message, from_socket, ignore_header) {
	    username = get_username(from_socket);
		    for (var i=0; i < sockets.length; i++ ) {
				        if (from_socket != sockets[i]) {
							            if (ignore_header) {
											                send_to_socket(sockets[i], message);
															            }
										            else {
														                send_to_socket(sockets[i], username + ': ' + message);
																		            }
													        }
						    }
}

function send_to_socket(socket, message) {
	    socket.write(message + '\n');
}

function execute_command(socket, command, args) {
	  console.log("command:"+command);
	      if (command == 'identify') {
			          delete_user(socket);
					          name = args.split(' ', 1)[0];
							          name_map[name] = socket;
									      }
		      if (command == 'me') {
				          name = get_username(socket);
						          send_to_all('**' + name + '** ' + args, socket, true);
								      }
			      if (command == 'chuck') {
					          var i = Math.floor(Math.random() * chuck_quotes.length);
							          send_to_all(chuck_quotes[i], socket, true);
									      }
				      if (command == 'who') {
						      console.log("kkk");
							          send_to_socket(socket, 'Identified users:');
									          for (var name in name_map) {
												              send_to_socket(socket, '- ' + name);
															          }
											      }
}

function send_private_message(socket, recipient_name, message) {
	    to_socket = name_map[recipient_name];
		    if (! to_socket) {
				        send_to_socket(socket, recipient_name + ' is not a valid user');
						        return;
								    }
			    send_to_socket(to_socket, '[ DM ' + get_username(socket) + ' ]: ' + message);
}
var s = net.Server(function(socket) {
		    sockets.push(socket);
			    socket.on('data', function(d) {
					        data = d.toString('utf8').trim();
							    //console.log(data);
							        // check if it is a command
							        var cmd_re = /^\/([a-z]+)[ ]*(.*)/g;
									        var dm_re = /^@([a-z]+)[ ]+(.*)/g;
											        cmd_match = cmd_re.exec(data)
													    
													  console.log(data);	
													          dm_match = dm_re.exec(data)
															          if (cmd_match) {
																	              var command = cmd_match[1];
																				              var args = cmd_match[2];
																							              execute_command(socket, command, args);
																										          }
																												          // check if it is a direct message
																												          else if (dm_match) {
																														              var recipient = dm_match[1];
																																	              var message = dm_match[2];
																																				              send_private_message(socket, recipient, message);
																																							          }
				        // if none of the above, send to all
				        else {
							            send_to_all(data, socket);
										        };

				    });
				    socket.on('close', function() {
							        sockets.splice(sockets.indexOf(socket), 1);
									        delete_user(socket);
											    });
});
s.listen(3000);
