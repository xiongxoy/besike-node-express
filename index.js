module.exports = express;

var http = require('http');
var Layer = require('./lib/layer.js');
var makeRoute = require('./lib/route.js');
var createInjector = require('./lib/injector.js');
var p2re = require("path-to-regexp");
var methods = require('methods');

function express() {
    'use strict';

    var app = function (request, response, next2) {
      //FIXME adding the following line would result in errors, why?
      //app.monkey_patch(request, response);
      request.__proto__.isExpress = true;
      response.__proto__.isExpress = true;
      request.res = response;
      response.req = request;
      response.redirect = function (code, path) {
        if (typeof code === 'string') {
          path = code;
          code = 302;
        }
        response.setHeader('Location', path);
        response.setHeader('Content-length', 0);
        response.statusCode = code;
        response.end();
      };

      if (next2) {
        var appParent = request.app;
        request.app = app;
        app.handle(request, response, function (err) {
          request.app = appParent;
          next2(err);
        });
      } else {
        request.app = app;
        app.handle(request, response, next2);
      }
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

        // TODO fix error not handled.
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
              try {
                if (error) {
                  target.handle(error, request, response, next);
                } else {
                  target.handle(request, response, next);
                }
              } catch(error2) {
                next(error2);
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
    app._factories = {};

    app.factory = function (name, fn) {
      app._factories[name] = fn;
    }

    app.listen = function (port, done) {
        var server =  http.createServer(app);
        server.listen(port, done);
        return server;
    };

    app.inject = function (handler) {
      return createInjector(handler, app);
    }

    app.use = function (path, middleware) {
        if (typeof path === 'function') {
            middleware = path;
            path = '/';
        }
        app.stack.push(new Layer(path, middleware, {end: false}));
    };

    methods = methods.slice(0);
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
    };

    app.monkey_patch = function (req, res) {
      (function patch_request() {
        var proto = require('./lib/request.js');
        //proto.res = res;
        proto.__proto__ = req.__proto__;
        req.__proto__ = proto;
      }());

      (function patch_response() {
        var proto = require('./lib/response.js');
        //proto.req = req;
        //proto.redirect =  function (code, path) {
          //if (typeof code === 'string') {
            //path = code;
            //code = 302;
          //}
          //res.setHeader('Location', path);
          //res.setHeader('Content-length', 0);
          //res.statusCode = code;
          //res.end();
        //}
        proto.__proto__ = res.__proto__;
        res.__proto__ = proto;
      }());
    };

    return app;

}; // end of function express();

