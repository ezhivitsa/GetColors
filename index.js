var request = require('request');
var Parallel = require('node-parallel');
var fs = require('fs');
var http = require('http');
var express = require('express');
var app = express();

var reg = /class=\"color-description\"\>\s.+\<strong\>(.*)\<\/strong\>/;

var result = {};
var doneNum = 0;
var start = 132*16*16*16*16;
var numReq = 136*16*16*16*16;
var doParallel = 100;

function getColor(color) {
	var hexColor = color.toString(16);
	var resColor = '';
	for ( var i = 0; i < 6 - hexColor.length; i++ ) {
		resColor += '0';
	}
	resColor += hexColor;
	return resColor;
}

function doRequest (resColor, done) {
	request.get('http://www.colorhexa.com/' + resColor, { timeout: 100000 }, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var desc = body.match(reg)[1];
			result[desc] = result[desc] || [];
			result[desc].push(resColor);
			done(error, desc);
		}
		else {
			log('error:   #' + resColor);
			doRequest(resColor, done);
		}
	});
}

function sortResult () {
	var keys = Object.keys(result);
	keys.forEach(function (key) {
		result[key].sort((a, b) => parseInt(a, 16) - parseInt(b, 16));
	});
}

function makeIntervals(colors) {
	var colorNames = Object.keys(colors);
	var result = [];
	colorNames.forEach(function (colorName) {
		var array = colors[colorName];
		var isNewSeq = true;
		var seq = null;
		var prev = null;

		for ( var i = 0; i < array.length; i++ ) {
			if ( isNewSeq ) {
				seq = {
					start: array[i],
					end: array[i],
					name: colorName
				};
				result.push(seq);

				isNewSeq = false;
				continue;
			}

			if ( parseInt(array[i], 16) - parseInt(array[i - 1], 16) !== 1 ) {
				seq.end = array[i - 1];
				isNewSeq = true;
				i--;
			}

			if ( i === array.length - 1 ) {
				seq.end = array[i];
			}
		}
	});

	return result;
}

function writeResult() {
	var res = JSON.stringify(result.sort((a,b) => parseInt(a.start, 16) - parseInt(b.start, 16)));
	// var res = JSON.stringify(result);
	fs.appendFile(__dirname + '/public/result-2.json', res, function (err) {
		if (err) throw err;
		log('It\'s saved!');
	});
}

function clearLog () {
	fs.writeFileSync(__dirname + '/public/log.html', '');
}

function log () {
	var text = Array.prototype.join.call(arguments, '');
	fs.appendFile(__dirname + '/public/log.html', '<div>' + text + '</div>', function () {
		console.log(text);
	});
} 

function doRequestSeq (start, end) {
	var parallel = new Parallel();
	parallel.timeout(100000);

	for ( var i = start; i < end && i < numReq; i++ ) {
		(function (i) {
			parallel.add(function(done){
				var resColor = getColor(i);
				doRequest(resColor, done);
			});
		})(i)
	}

	parallel.done(function(err, results) {
		if (err) throw err;
		// results => ["jack", "tony", "fat"];
		if ( end < numReq - 1 ) {
			doneNum += doParallel;
			if ( doneNum % (doParallel*20) === 0 ) {
				log(new Date(Date.now()), ' ------ ', doneNum);
			}
			setTimeout(doRequestSeq, 0, end, end + doParallel);
		}
		else {
			sortResult();
			result = makeIntervals(result);
			writeResult();
		}
	});
}


// doRequest(0);

app.use(express.static('public'));

var port = process.env.PORT || 3000;
var server = app.listen(port, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('Example app listening at http://%s:%s', host, port);

	clearLog();
	log(new Date(Date.now()), ' ------ ', doneNum);
	doRequestSeq(start, start + doParallel);
});