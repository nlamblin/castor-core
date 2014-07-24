'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , assert = require('assert')
  , include = require('./include.js')
  ;

function Hook() {

  var self = this;
  self.basedir = '';
  self.object = {};
}

Hook.prototype.from = function (basedir)
{
  var self = this;
  assert.equal(typeof basedir, 'string');
  self.basedir = basedir;
  return self;
}

Hook.prototype.over = function (object)
{
  var self = this;
  assert.equal(typeof object, 'object');
  self.object = object;
  return self;
}

Hook.prototype.apply = function (callback)
{
  var self = this;
  assert.equal(typeof callback, 'function');
  Object.keys(self.object).sort().forEach(function (key) {
      var name = key.split('-').pop(),
          value = self.object[key],
          func = include(self.basedir, value);
      callback(name, func);
    }
  );
}

module.exports = function () {
  return new Hook();
}

