var express = require('express');
var jenkinsapi = require('jenkins-api');
var app = express();
var http = require('http').Server(app);
var https = require('https');
var fs = require('fs');
var jenkins = jenkinsapi.init('http://blu01:5afd2840073f0d6211b7342fb33ee7e7@jenkins.ssdm.bskyb.com:8080/jenkins', {strictSSL: false});


var httpsOptions = {
  key:  fs.readFileSync('certs/server/my-server.key.pem'),
  cert: fs.readFileSync('certs/server/my-server.crt.pem'),
  ca:   fs.readFileSync('certs/server/my-root-ca.crt.pem')
};

var httpsServer = https.createServer(httpsOptions);
io = require('socket.io').listen(httpsServer);


var currentJobNumber = 0;


io.on('connection', function(socket){
  console.log("someone connected!");
  socket.on('status_update', function(payload){
    triggerBuild(payload.repository, payload.branch, function(){
      socket.emit('status_finished', {status:2});
    });
  });
});




var pollBuildTillDone = function(packageName, expectedBuildNumber, callback) {
  var fetch = function(){
    jenkins.build_info(packageName, expectedBuildNumber, function(err, data) {
      if (err || data.building){
        console.log(packageName + " is in progress");
        setTimeout(fetch, 5000);
        return;
      }

      callback(data);

    });
  };

  setTimeout(fetch, 500);
};


var triggerBuild = function(repo, branch, callback){
  jenkins.build(repo, {BRANCH: branch}, function(err, data) {
    res.json({message: 'build started for ' + repo});

    jenkins.last_build_info(repo, function(err, data) {
      if (err){ return console.log(err); }

      pollBuildTillDone(repo, data.number+1, callback);

    });

    // if (err){ return console.log(err); }
    // console.log(data);
  });
};


httpsServer.listen(3000, function () {

  console.log('Example app listening at ');
});

// app.post('/', function (req, res) {

//   if (!req.body) {
//     res.json({message: 'no package name set'});
//     return;
//   }

// });

// http://blu01:5afd2840073f0d6211b7342fb33ee7e7@jenkins.ssdm.bskyb.com:8080/jenkins/view/sdc-packages/job/package-match-base/buildWithParameters?BRANCH=master

// var server = http.listen(3000, function () {
//   var host = server.address().address;
//   var port = server.address().port;

//   console.log('Example app listening at http://%s:%s', host, port);
// });