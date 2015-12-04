var express = require('express');
var jenkinsapi = require('jenkins-api');
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

var jobs = {};


var currentJobNumber = 0;


io.on('connection', function(socket){
  console.log("someone connected!");
  socket.on('status_update', function(payload){
    console.log("In Status update");
    console.log(payload);

    triggerBuild(socket, payload.repository, payload.branch, function(){
      socket.emit('status_finished', {status:2});
    });
  });
});




var pollBuildTillDone = function(socket, packageName, expectedBuildNumber, callback) {
  var fetch = function(){
    jenkins.build_info(packageName, expectedBuildNumber, function(err, data) {
      if (err || data.building){
        console.log(packageName + " is in progress");
        socket.emit('status_change', {
          job_name: packageName,
          job_number: expectedBuildNumber,
          status: 1
        });
        setTimeout(fetch, 5000);
        return;
      }

      console.log(data);
      console.log(packageName + " has finished");
      var result = data.result == 'SUCCESS' ? 2 : 3;
      socket.emit('status_change', {
        job_name: packageName,
        job_number: expectedBuildNumber,
        status: result
      });

    });
  };

  setTimeout(fetch, 500);
};


var triggerBuild = function(socket, repo, branch, callback){
  jenkins.build(repo, {BRANCH: branch}, function(err, data) {

    jenkins.last_build_info(repo, function(err, data) {
      if (err){ return console.log(err); }

      socket.emit("status_change", {
        job_name: repo,
        job_number: data.number+1,
        status: 1
      });

      pollBuildTillDone(socket, repo, data.number+1, callback);

    });

  });
};


httpsServer.listen(3000, function () {

  console.log('Example app listening at ');
});
