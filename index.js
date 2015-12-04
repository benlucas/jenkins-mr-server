var express = require('express');
//var io = require('socket.io')(80);
var jenkinsapi = require('jenkins-api');
var app = express();
var jenkins = jenkinsapi.init('http://blu01:5afd2840073f0d6211b7342fb33ee7e7@jenkins.ssdm.bskyb.com:8080/jenkins', {strictSSL: false});
var bodyParser = require('body-parser')

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

app.post('/', function (req, res) {
  if (!req.body) {
  	res.json({message: 'no package name set'});
  } else {
  	jenkins.build(req.body.package_name, {BRANCH: 'master'}, function(err, data) {
  		res.json({message: 'build started for ' + req.body.package_name});
  		jenkins.last_build_info(req.body.package_name, function(err, data) {
		  if (err){ return console.log(err); }
		  console.log(data);
		});
    if (err){ return console.log(err); }
    	console.log(data);
    });
  }
});

// http://blu01:5afd2840073f0d6211b7342fb33ee7e7@jenkins.ssdm.bskyb.com:8080/jenkins/view/sdc-packages/job/package-match-base/buildWithParameters?BRANCH=master

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});