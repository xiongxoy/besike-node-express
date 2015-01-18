module.exports = express;

var http = require('http');
var Layer = require('./lib/layer.js');
var makeRoute = require('./lib/route.js');
var p2re = require("path-to-regexp");
var methods = require('methods');

function express() {
    'use strict';

    var app = function (request, response, next2) {
      app.handle(request, response, next2);
    };

    app.handle = function (request, response, next2) {
        var stackIndex;
        (function startApp() {
            request.params = {};
            stackIndex = 0; // index for stack
            try {
                next();
            } catch (error) {
                end(500, error);
            }
        }());

        function next(error) {
          var m, target;
          for (; stackIndex < app.stack.length; stackIndex++) {
            target = app.stack[stackIndex];
            if ((isErrorHandler(target.handle) === Boolean(error))
             && (m = target.match(request.url))) {
              // trim url
              if (isApp(target.handle)) {
                request.oldUrl = request.url;
                request.url = request.url.slice(m.path.length);
                request.url = request.url[0] === '/' ? request.url : '/' + request.url;
              }
              // call handle
              request.params = m.params;
              stackIndex++;
              if (error) {
                target.handle(error, request, response, next);
              } else {
                target.handle(request, response, next);
              }
              return;
            }
          }
          if (error) {
            end(500, error);
          } else {
            end(404);
          }
        }

        // end request
        function end(code, error) {
          if (request.oldUrl) {
            request.url = request.oldUrl;
            delete request.oldUrl;
          }

          if (code === 500) {
            if (next2) {
              next2(error);
              return;
            }
            response.statusCode = code;
            response.end();
          } else if (code === 404) {
            if (next2) {
              next2();
              return;
            }
            response.statusCode = code;
            response.end("404 - Not Found");
          }
        }

        function isSame(a, b) {
          return Boolean(a) == Boolean(b);
        }

        function isApp(handle) {
            return typeof handle.handle === 'function';
        }

        function isErrorHandler(fn) {
            return fn.length >= 4;
        }

    }; // end of handle function (request, response, next2);

    app.stack = [];

    app.listen = function (port, done) {
        var server =  http.createServer(app);
        server.listen(port, done);
        return server;
    };

    app.use = function (path, middleware) {
        if (typeof path == 'function') {
            middleware = path;
            path = '/';
        }
        app.stack.push(new Layer(path, middleware));
    };

    methods.push('all');
    methods.forEach(function (method) {
      app[method] = function (path, handler) {
        app.route(path)[method](handler);
        return app;
      };
    });

    app.route = function (path) {
      var route = makeRoute()
      app.stack.push(new Layer(path, route, {end: true}));
      return route;
    }

    return app;
}; // end of function express();

