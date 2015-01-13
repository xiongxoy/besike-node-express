module.exports = express;

var http = require('http');
var Layer = require('./lib/layer.js');

function express() {
    'use strict';

    var app = function (request, response, next2) {

        var stackIndex;
        (function startApp() {
            stackIndex = 0; // index for stack
            try {
                next();
            } catch (error) {
                end(500, error);
            }
        }());

        function next(error) {
            if (!error) {
                callWithoutError(next);
            } else {
                callWithError(next, error);
            }
        }

        // end request
        function end(code, error) {
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

        function callWithoutError(next) {
            for (; stackIndex < app.stack.length; stackIndex++) {
                if (!isErrorHandler(app.stack[stackIndex].handle) &&
                    app.stack[stackIndex].match(request.url)) {
                    app.stack[stackIndex++].handle(request, response, next);
                    return;
                }
            }
            end(404);
        }

        function callWithError(next, error) {
            for (; stackIndex < app.stack.length; stackIndex++) {
                if (isErrorHandler(app.stack[stackIndex].handle) &&
                    app.stack[stackIndex].match(request.url)) {
                    app.stack[stackIndex++].handle(error, request, response, next);
                    return;
                }
            }
            end(500, error);
        }

        function isErrorHandler(fn) {
            return fn.length >= 4;
        }

    }; // end of function app(request, response, next2);

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

    return app;
}; // end of function express();

