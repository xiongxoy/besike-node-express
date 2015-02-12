module.exports = express;

var http = require('http');
var Layer = require('./lib/layer.js');
var makeRoute = require('./lib/route.js');
var createInjector = require('./lib/injector.js');
var p2re = require("path-to-regexp");
var methods = require('methods');
var mime = require('mime');
var accepts = require('accepts');
var crc32 = require('buffer-crc32');

function express() {
    'use strict';

    var app = function (req, res, next2) {
      app.monkey_patch(req, res);

      if (next2) {
        var appParent = req.app;
        req.app = app;
        app.handle(req, res, function (err) {
          req.app = appParent;
          next2(err);
        });
      } else {
        req.app = app;
        app.handle(req, res, next2);
      }
    };

    app.handle = function (req, res, next2) {
        var stackIndex;
        (function startApp() {
            req.params = {};
            stackIndex = 0; // index for stack
            try {
              next();
            } catch (error) {
                error.statusCode = error.statusCode || 500;
                end(error);
            }
        }());

        function next(error) {
          var m, target;
          for (; stackIndex < app.stack.length; stackIndex++) {
            target = app.stack[stackIndex];
            if ((isErrorHandler(target.handle) === Boolean(error))
             && (m = target.match(req.url))) {
              if (isApp(target.handle)) {
                 // trim url
                req.oldUrl = req.url;
                req.url = req.url.slice(m.path.length);
                req.url = req.url[0] === '/' ? req.url : '/' + req.url;
              }
              // call handle
              req.params = m.params;
              stackIndex++;
              try {
                if (error) {
                  target.handle(error, req, res, next);
                } else {
                  target.handle(req, res, next);
                }
              } catch (error2) {
                error2.statusCode = error2.statusCode || 500;
                next(error2);
              }
              return;
            }
          }
          if (error) {
            error.statusCode = error.statusCode || 500;
            end(error);
          } else {
            end(404);
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

        // end req
        function end(error) {

          if (req.oldUrl) {
            req.url = req.oldUrl;
            delete req.oldUrl;
          }

          if (next2) {
            if (error == 404) {
              next2();
            } else {
              next2(error);
            }
            return;
          }

          if (typeof error == 'number') {
            res.statusCode = error;
            res.end();
          } else if (error.statusCode) {
            res.statusCode = error.statusCode;
            res.end(error.toString());
          } else {
            res.statusCode = 500;
            res.end(error.toString());
          }
        }

    }; // end of handle function (req, res, next2);

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
        var proto = {};
        proto.isExpress = true;
        proto.res = res;

        proto.__proto__ = req.__proto__;
        req.__proto__ = proto;
      }());

      // FIXME How to move the patch content to lib/request.js?
      (function patch_response() {
        var proto = {};
        proto.isExpress = true;
        proto.req = req;

        proto.redirect = function (code, path) {
          if (typeof code === 'string') {
            path = code;
            code = 302;
          }
          res.setHeader('Location', path);
          res.setHeader('Content-length', 0);
          res.statusCode = code;
          res.end();
        };

        proto.type = function (ext) {
          res.setHeader('Content-Type', mime.lookup(ext));
        };

        proto.default_type = function (ext) {
          var contentType = res.getHeader('Content-Type');
          if (contentType) {
            return;
          } else {
            res.type(ext);
          }
        }

        var accept = accepts(req);
        proto.format = function (o) {
          var keys = Object.keys(o);
          var type = accept.types(keys); // FIXME why must store type in a variable?
          if (o[type]) {
            res.setHeader('Content-Type', mime.lookup(type));
            o[type]();
          } else {
            var err = new Error("Not Acceptable");
            err.statusCode = 406;
            throw err;
          }
        }

        // add res.send
        proto.send = function (code, content) {
          var empty = false;
          if (typeof code != 'number') {
            content = code;
            code = 200;
          }
          res.statusCode = code;

          if (!content)  {
            content = http.STATUS_CODES[code];
            empty = true;
          }

          if (!empty && !res.getHeader('Etag') && req.method == 'GET') {
            res.setHeader('Etag',  '"' + crc32.unsigned(content) + '"' );
          }

          // FIXME does caps matter?
          if (this.req.headers["if-none-match"]) {
            if ( this.req.headers["if-none-match"] == res.getHeader('Etag')) {
              res.statusCode = 304;
              res.end();
            } else {
              res.statusCode = 200;
            }
          }

          if (this.req.headers['if-modified-since']) {
            var date = new Date(this.req.headers['if-modified-since']);
            var date_modified = new Date(res.getHeader('Last-Modified'));
            if ( date < date_modified  ) {
              res.statusCode = 200;
            } else {
              res.statusCode = 304;
              res.end();
            }
          }

          if (!res.getHeader('Content-Type')) {
            if (content instanceof Buffer) {
              res.setHeader('Content-Type', 'application/octet-stream');
              res.setHeader('Content-Length', content.length);
            } else if (typeof content == 'string' ||
                       content instanceof String) { // TODO How to deal with String?
              res.setHeader('Content-Type', 'text/html');
              res.setHeader('Content-Length', Buffer.byteLength(content));
            } else {
              content = JSON.stringify(content);
              res.setHeader('Content-Type', 'application/json');
            }
          }

          res.end(content);
        }

        proto.__proto__ = res.__proto__;
        res.__proto__ = proto;
      }());
    };

    return app;

}; // end of function express();

