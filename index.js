module.exports = myexpress;

var http = require('http');

function myexpress() {
  var app = function (request, response) {
    response.statusCode = 404;
    response.end();
  };

  app.listen = function (port, done) {
    var server =  http.createServer(app);
    server.listen(port);
    if (done) {
      done();
    }
    return server;
  };

  return app;
}
