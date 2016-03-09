'use strict';

var path         = require('path');
var basename     = path.basename(__filename, '.js')
var debug        = require('debug')('castor:' + basename)
var assert       = require('assert');
var process      = require('process');
var request      = require('supertest');


describe('Operators', function () {

  var server = null;

  before(function(done) {

    process.chdir(__dirname);

    require('../starter.js')(function(config, start) {
      start(function(err, serv) {
        server = serv;
        // Because some module removes console.log
        console.log = console.info;
        done(err);
      });
    })

  });

  //////////////////////////////////

  describe('count', function () {

    this.timeout(500);
    it('should work', function () {
      assert(true);
    });

    it('should return results', function (done) {
      request(server)
        .get('/hotfolder/$count')
        .expect(200)
        .expect('[{"_id":"_wid","value":29}]', done);
    });

  });

  //////////////////////////////////
  after(function(done) {
    server.close(function(err) {
      done(err);
    });
  });

});
