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
var status = {
  pending: 1,
  success: 2,
  failure: 3
};

io.on('connection', function(socket){
  console.log("someone connected!");
  socket.on('status_update', function(payload){
    console.log("In Status update");
    console.log(payload);

    var property = payload.repository+payload.recent_hash;
    var jobExists = jobs.hasOwnProperty(property);

    if(jobExists){
      console.log("Job exists! " + property);
      socket.emit('status_change', {
        job_name: payload.repository,
        job_number: jobs[property].job_number,
        status: jobs[property].status
      });

      if(jobs[property].status == status.pending) {
        console.log("Job is pending, start watching it!");
        watchRepo(socket, payload.repository, payload.recent_hash);
      }
      if(jobs[property].status == status.success) {
        console.log("Job is success");
      }
      if(jobs[property].status == status.failure) {
        console.log("Job is failure");
      }

      return;
    }

    console.log(property);
    jobs[property] = {
      status: status.pending,
      job_number: null
    };
    triggerBuild(socket, payload.repository, payload.branch, payload.recent_hash);
  });
});

var pollBuildTillDone = function(socket, packageName, expectedBuildNumber, hash) {
  var property = packageName+hash;
  console.log(property);
  jobs[property].job_number = expectedBuildNumber;


  var fetch = function(){
    jenkins.build_info(packageName, expectedBuildNumber, function(err, data) {
      if (err || data.building){
        console.log(packageName + " is in progress");
        socket.emit('status_change', {
          job_name: packageName,
          job_number: expectedBuildNumber,
          status: status.pending
        });
        setTimeout(fetch, 5000);
        return;
      }
      var result = data.result == 'SUCCESS' ? 2 : 3;

      console.log(data);
      console.log(packageName + " has finished");

      jobs[property].status = result;

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
      status: status.pending
    });

    pollBuildTillDone(socket, repo, data.number+1, hash);

  });
}

httpsServer.listen(3000, function () {
  console.log('Example app listening at ');
});
