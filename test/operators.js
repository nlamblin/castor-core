'use strict';

var path         = require('path');
var basename     = path.basename(__filename, '.js')
var debug        = require('debug')('castor:' + basename)
var assert       = require('assert');
var process      = require('process');
var app          = require('../app');
var Configurator = require('../configurator.js');
var server       = null;

describe('Operators', function () {

  before(function(done) {
    var config       = new Configurator();
    config.fix('connectionURI', 'mongodb://localhost:27017/castor-core-test');
    config.fix('dataPath',      path.resolve(__dirname, 'dataset'));
    config.fix('viewPath',      '..');

    process.chdir('..');

    app(config, function (err, castorServer) {
      if (err) {
        debug("err",err);
        process.exit(1);
      }
      server = castorServer;
      done(err);
    })
  });

  describe('distinct', function () {

    it('should work', function () {
      assert(true);
    })

  });

  after(function(done) {
    server.close(function(err) {
      done(err);
    });
  });

});
