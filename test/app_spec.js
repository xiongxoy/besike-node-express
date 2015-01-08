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
});
