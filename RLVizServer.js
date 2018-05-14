//Setup the server
var http = require('http');
var https = require('https');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
var express = require('express');
var app = module.exports.app = express();



//Serve from the public folder
app.use(express.static(__dirname + '/public'));


function preExpose(app){
	app.use(function (req, res, next) {
		res.locals.req = req;
		res.locals.res = res;
		next();
	})
}

//Expose server params/needs to environment
preExpose(app);

var server = http.createServer(app);
var io = require('socket.io').listen(server);
var socketid;


io.sockets.on('connection', function (socket) {
	console.log('Connection established');
	socketid = socket.id;
});



//Start the server
server.listen(8888, function() {
    console.log('Server listening on port: ' + server.address().port);
});


////////////////////////////////////////////////////
//POST functions


//Load our required modules
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var fs = require('fs');
var exec = require('child_process').execFile;
var request = require('request');


//Function to read in and parse the replay input file from the user
function readReplayInputLocal(req, res){
	var gameplayDataFile = req.files.RLReplayLocalFile.path;
	
	fs.readFile(gameplayDataFile, function (err, data) {
	  if (err) throw err;
	  var newPath = __dirname + "/replayfile.replay";
	  fs.writeFile(newPath, data, function (err) {});
	});

	
	var cmd = __dirname +'/octane.exe';
	
	//Parse with octane parser
	exec(cmd, args = [__dirname + "/replayfile.replay"], {maxBuffer: 1024 * 10000}, function(error, stdout, stderr) {
		console.log(error);
		//fs.writeFile(__dirname + "/replay.json", stdout, function (err) {}); //Debugging
		console.log("File parsed");
		//Send message to client socket when parsed, then send message back to retrieve data
		console.log("Sending Data");
		io.to(socketid).emit('dataReady', stdout);
		console.log("done");
	});
}

//Function to read in and parse the replay input file from URL
function readReplayInputURL(req, res){
	var gameplayDataURL= req.body.RLReplayURLFile;
	
	console.log("Requested replay at " + req.body.RLReplayURLFile);
	
	var replay = fs.createWriteStream(__dirname + "/replayfile.replay");
	
	//Get the file from URL
	var requestFile = http.get(req.body.RLReplayURLFile, function(response) {
		console.log("File retrieved");
		response.pipe(replay);
		
		//Once file is read, parse
		replay.on('finish', function() {
			var cmd = __dirname +'/octane.exe';
			
			//Parse with octane parser
			exec(cmd, args = [__dirname + "/replayfile.replay"], {maxBuffer: 1024 * 10000}, function(error, stdout, stderr) {
				console.log(error);
				//fs.writeFile(__dirname + "/replay.json", stdout, function (err) {}); //Debugging
				console.log("File parsed");
				//Send message to client socket when parsed, then send message back to retrieve data
				console.log("Sending Data");
				io.to(socketid).emit('dataReady', stdout);
				console.log("done");
			});
		});
	});
	
	
	
}

app.post('/ReadRLVizInputLocal', multipartMiddleware, readReplayInputLocal);
app.post('/ReadRLVizInputURL', multipartMiddleware, readReplayInputURL);
