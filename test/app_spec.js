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

    it ('should return a funtion', function () {
      expect(app).to.be.a('function');
    });

    it ('should return 404', function (done) {
      var server = http.createServer(app);
      request(server).get('/foo').expect(404).end(done);
    })
  });
});
