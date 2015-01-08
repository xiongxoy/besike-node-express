var express = require('../');
var request = require('supertest');
var expect = require('chai').expect;
var http = require("http");

describe("app", function () {
  var app;

  describe('create http server', function () {
    before(function () {
      app = express();
      app.use(function (request, response, next) {
        response.statusCode = 404;
        response.end();
      });
    });

    it ('should return 404', function (done) {
      request(app).get('/foo').expect(404).end(done);
    });
  });

  describe("#listen",function() {
    var port = 5000;
    var server;

    before(function(done) {
      app = express();
      app.use(function (request, response, next) {
        response.statusCode = 404;
        response.end();
      });
      server = app.listen(port,done);
    });

    it('should return a http.Server', function () {
      expect(server).to.be.an.instanceof(http.Server);
    });

    it('should responds to /foo with 404', function (done) {
      request("http://localhost:"+ port).get("/foo").expect(404).end(done);
    });

  });

  describe('.use', function () {
    before(function () {
      app = express();
      var m1 = function() {};
      var m2 = function() {};
      app.use(m1);
      app.use(m2);
    });

    it ('should have an arry of functions', function() {
      expect(app.stack).to.be.instanceof(Array);
      expect(app.stack[0]).to.be.a('function');
    });

    it ('should have size 2', function() {
      expect(app.stack.length).to.equal(2);
    });
  });


  describe("calling middleware stack",function() {
    beforeEach(function() {
      app = new express();
    });

    it ('should be able to call a single middleware', function (done) {
      var m1 = function(req,res,next) {
        res.end("hello from m1");
      };
      app.use(m1);
      request(app).get('/foo').expect("hello from m1").end(done);
    });


    it ('should be able to call next to go to the next ', function (done) {
      var m1 = function(req,res,next) {
        next();
      };
      var m2 = function(req,res,next) {
        res.end("hello from m2");
      };

      app.use(m1);
      app.use(m2);

      request(app).get('/foo').expect("hello from m2").end(done);
    });

    it ('should 404 at the end of middleware chain', function (done) {
      var m1 = function(req,res,next) {
        next();
      };

      var m2 = function(req,res,next) {
        next();
      };

      app.use(m1);
      app.use(m2);

      request(app).get('/foo').expect(404).end(done);
    });

    it ('should 404 if no middleware is added', function (done) {
      app.stack = []
      request(app).get('/foo').expect(404).end(done);
    });
  });

  describe('Implement Error Handling', function() {
    beforeEach(function() {
      app = new express();
    });

    it ('should return 500 for unhandled error', function (done) {
      var m1 = function(req,res,next) {
        next(new Error("boom!"));
      }
      app.use(m1);
      request(app).get('/foo').expect(500).end(done);
    });

    it ('should should return 500 for uncaught error', function (done) {
      var m1 = function(req,res,next) {
        throw new Error("boom!");
      };
      app.use(m1)
      request(app).get('/foo').expect(500).end(done);
    });

    it ('should should skip error handlers when next is called without an error', function (done) {
      var m1 = function(req,res,next) {
        next();
      }

      var e1 = function(err,req,res,next) {
        // timeout
      }

      var m2 = function(req,res,next) {
        res.end("m2");
      }

      app.use(m1);
      app.use(e1); // should skip this. will timeout if called.
      app.use(m2);

      request(app).get('/foo').expect("m2").end(done);
    });

    it ('should skip normal middlewares if next is called with an error', function (done) {
      var m1 = function(req,res,next) {
        next(new Error("boom!"));
      }

      var m2 = function(req,res,next) {
        // timeout
      }

      var e1 = function(err,req,res,next) {
        res.end("e1");
      }

      app.use(m1);
      app.use(m2); // should skip this. will timeout if called.
      app.use(e1);

      request(app).get('/foo').expect("e1").end(done);
    });
  });

  describe('Implement App Embedding As Middleware', function() {
    var subApp;

    it ('should pass unhandled request to parent', function (done) {
      app = new express();
      subApp = new express();

      function m2(req,res,next) {
        res.end("m2");
      }

      app.use(subApp);
      app.use(m2);

      request(app).get('/foo').expect("m2").end(done);
    });


    it ('should pass unhandled error to parent', function (done) {
      app = new express();
      subApp = new express();

      function m1(req,res,next) {
        next("m1 error");
      }

      function e1(err,req,res,next) {
        console.log("here");
        res.end(err);
      }

      subApp.use(m1);

      app.use(subApp);
      app.use(e1);

      request(app).get('/foo').expect("m1 error").end(done);
    });

  });

});
