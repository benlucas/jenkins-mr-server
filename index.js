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

    var property = payload.repository+payload.recentHash;
    var jobExists = jobs.hasOwnProperty(property);

    if(jobExists){
      console.log("Job exists! " + property);
      socket.emit('status_change', {
        job_name: payload.repository,
        job_number: '',
        status: jobs[property]
      });

      if(jobs[property] == 1) {
        console.log("Job is pending, start watching it!");
        watchRepo(socket, payload.repository);
      }
      if(jobs[property] == 2) {
        console.log("Job is success");
      }
      if(jobs[property] == 3) {
        console.log("Job is failure");
      }

      return;
    }

    jobs[property] = 1;
    triggerBuild(socket, payload.repository, payload.branch, payload.recentHash);
  });
});




var pollBuildTillDone = function(socket, packageName, expectedBuildNumber, hash) {
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
      var result = data.result == 'SUCCESS' ? 2 : 3;
      var property = packageName+hash;

      console.log(data);
      console.log(packageName + " has finished");

      jobs[property] = result;

      socket.emit('status_change', {
        job_name: packageName,
        job_number: expectedBuildNumber,
        status: result
      });

    });
  };

  setTimeout(fetch, 500);
};


var triggerBuild = function(socket, repo, branch, hash){
  jenkins.build(repo, {BRANCH: branch}, function(err, data) {

    watchRepo(socket, repo, hash);

  });
};


var watchRepo = function(socket, repo, hash) {
  jenkins.last_build_info(repo, function(err, data) {
    if (err){ return console.log(err); }

    socket.emit("status_change", {
      job_name: repo,
      job_number: data.number+1,
      status: 1
    });

    pollBuildTillDone(socket, repo, data.number+1, hash);

  });
}


httpsServer.listen(3000, function () {
  console.log('Example app listening at ');
});
