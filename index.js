module.exports = myexpress;

var http = require('http');

function myexpress() {

  var app = function (request, response) {

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
        if (app.next2) {
          app.next2(error);
        }
        response.statusCode = code;
        response.end();
      } else if (code == 404) {
        if (app.next2) {
          app.next2();
        }
        response.statusCode = code;
        response.end("404 - Not Found");
      }
    }

    if (app.stack && app.stack[0]) { // app not empty
      next.index = 0; // index for stack
      try {
        next();
      } catch(error) {
        end(500, error);
      }
    } else { // app is empty
      end(404);
    }

    function callWithoutError(next) {
      if (next.index == app.stack.length) {
        end(404);
        return;
      } else {
        // find a middleware with no error parameter
        while(app.stack[next.index].length != 3) {
          next.index += 1;
          if (next.index == app.stack.length) {
            end(404);
            return;
          }
        }
        next.index += 1;
        app.stack[next.index-1](request, response, next);
      }
    }

    function callWithError(next, error) {
      if (next.index == app.stack.length) {
        end(500, error)
        return;
      } else {
        // find a middleware with error parameter
        while(app.stack[next.index].length != 4) {
          next.index += 1;
          if (next.index == app.stack.length) {
            end(500, error)
            return;
          }
        }
        next.index += 1;
        app.stack[next.index-1](error, request, response, next);
      }
    }

  } // end of function app(request, response);

  app.listen = function (port, done) {
    var server =  http.createServer(app);
    server.listen(port, done);
    return server;
  };

  app.use = function (middleware) {
    app.stack = app.stack || [];

    if (!middleware.use) {
      app.stack.push(middleware);
    } else  { // middleware is an app
      var embeddingMiddleware = createEmbeddingMiddleware(middleware);
      app.stack.push(embeddingMiddleware);
    }
  }

  function createEmbeddingMiddleware(subApp) {
    var embeddingMiddleware = function (request, response, next) {
      // start inner middleware
      subApp.next2 = next;
      subApp(request, response);
    }
    return embeddingMiddleware;
  }

  return app;

}; // end of function myexpress();

