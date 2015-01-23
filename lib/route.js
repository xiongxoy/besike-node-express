module.exports = makeRoute;
var methods = require('methods');

function makeRoute() {
  'use strict'

  var route = function (req, res, next2) {

    var stackIndex;
    (function startRoute() {
      stackIndex = 0; // index for stack
      try {
        next();
      } catch (error) {
        next2(error);
      }
    }());


    function next(error) {
      if (error) {
        if (error === 'route') {
          next2();
        } else {
          next2(error);
        }
      }

      if (route.stack && route.stack[0]) {
        if (route.stack.length === stackIndex) {
          next2();
        } else {
          var target;
          stackIndex++;
          target = route.stack[stackIndex-1];
          if ((target.verb.toUpperCase() === 'ALL')  ||
              (req.method.toUpperCase() === target.verb.toUpperCase())) {
            target.handler(req, res, next);
          } else {
            next();
          }
        }
      } else {
        next2();
      }
    }

  };

  route.stack = [];

  route.use = function (verb, handler) {
    route.stack.push({
      verb: verb,
      handler: handler
    });
  }

  methods = methods.slice(0);
  methods.push("all");
  methods.forEach(function (verb) {
    route[verb] = function (handler) {
      route.use(verb, handler);
      return route;
    };
  });

  return route;
}
