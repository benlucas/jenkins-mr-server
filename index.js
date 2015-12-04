var express = require('express');
var io = require('socket.io')(80);
var app = express();

app.get('/', function (req, res) {
  res.json({message: "Hello World!"});
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});