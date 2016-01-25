'use strict';
const fs = require('fs');
const colors = require('./public/result');
// const base64Img = require('base64-img');

let colorNames = {};
colors.forEach(function (color) {
	if ( !colorNames[color.name] ) {
		base64Img.requestBase64('http://www.colorhexa.com/' + color.start + '.png', function(err, res, body) {
			colorNames[color.name] = body;
		});
	}
});

var res = JSON.stringify(colorNames);
// var res = JSON.stringify(result);
fs.appendFile(__dirname + '/public/colors.js', res, function (err) {
	if (err) throw err;
	console.log('It\'s saved!');
});