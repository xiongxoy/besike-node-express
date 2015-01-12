module.exports = myexpress;

var http = require('http');

function myexpress() {

  var app = function (request, response, next2) {
    var stackIdx;

    (function startApp() {
      if (app.stack && app.stack[0]) { // app not empty
        stackIndex = 0; // index for stack
        try {
          next();
        } catch(error) {
          end(500, error);
        }
      } else {                        // app is empty
        end(404);
      }
    })();

    function next(error) {
      if (!error) {
        callWithoutError(next);
      } else {
        callWithError(next, error);
      }
    }

    // end request
    function end(code, error) {
      if (code == 500) {
        if (next2) {
          next2(error);
        }
        response.statusCode = code;
        response.end();
      } else if (code == 404) {
        if (next2) {
          next2();
        }
        response.statusCode = code;
        response.end("404 - Not Found");
      }
    }

    function callWithoutError(next) {
      for (; stackIndex < app.stack.length; stackIndex++) {
        if (app.stack[stackIndex].length == 3) {
          app.stack[stackIndex++](request, response, next);
          break;
        }
      }
      end(404);
    }

    function callWithError(next, error) {
      for (; stackIndex < app.stack.length; stackIndex++) {
        if (app.stack[stackIndex].length == 4) {
          app.stack[stackIndex++](error, request, response, next);
          break;
        }
      }
      end(500, error)
    }

  } // end of function app(request, response, next2);

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

}; // end of function myexpress();

