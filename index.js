module.exports = myexpress;

var http = require('http');

function myexpress() {

  var app = function (request, response) {
    if (app.stack && app.stack[0]) {
      next.index = 0;
      next();
    }
    else {
      response.statusCode = 404;
      response.end("404 - Not Found");
    }

    function next() {
      if (next.index == app.stack.length) {
        response.statusCode = 404;
        response.end("404 - Not Found");
      } else {
        next.index += 1;
        app.stack[next.index-1](request, response, next);
      }
    }
  };


  app.listen = function (port, done) {
    var server =  http.createServer(app);
    server.listen(port, done);
    return server;
  };

  app.use = function (middleware) {
    app.stack = app.stack || [];
    app.stack.push(middleware);
  }

  return app;
}
