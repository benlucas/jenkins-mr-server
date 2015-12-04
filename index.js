var express = require('express');
var io = require('socket.io')(80);
var jenkinsapi = require('jenkins-api');
var app = express();
var jenkins = jenkinsapi.init('http://blu01:5afd2840073f0d6211b7342fb33ee7e7@jenkins.ssdm.bskyb.com:8080/jenkins', {strictSSL: false});

app.get('/', function (req, res) {
  res.json({message: "Hello World!"});

  jenkins.build('package-match-base', {BRANCH: 'master'}, function(err, data) {
    if (err){ return console.log(err); }
    console.log(data)
  });

});

// http://blu01:5afd2840073f0d6211b7342fb33ee7e7@jenkins.ssdm.bskyb.com:8080/jenkins/view/sdc-packages/job/package-match-base/buildWithParameters?BRANCH=master

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});