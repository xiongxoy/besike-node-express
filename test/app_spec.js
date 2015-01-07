var express = require('../');
var request = require('supertest');
var expect = require('chai').expect;
var http = require("http");

describe("app", function () {
  describe('create http server', function () {
    var app;

    before(function() {
      app = express();
    });

    it ('should return 404', function (done) {
      request(app).get('/foo').expect(404).end(done);
    });
  });

  describe("#listen",function() {
    var app = express();
    var port = 5000;
    var server;

    before(function(done) {
      server = app.listen(port,done);
    });

    it('should return a http.Server', function () {
      expect(server).to.be.an.instanceof(http.Server);
    });

    it('should responds to /foo with 404', function (done) {
      request("http://localhost:"+ port).get("/foo").expect(404).end(done);
    });

  });
});
