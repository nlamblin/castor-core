'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , assert = require('assert')
  , include = require('./include.js')
  ;

function Hook(nd) {

  var self = this;
  self.basedirs = [];
  self.object = {};
  self.namedir = nd || 'hooks';
}

Hook.prototype.from = function ()
{
  var self = this;
  Array.prototype.slice.call(arguments, 0).forEach(function(x) {
    self.basedirs.push(path.join(x, self.namedir));
    self.basedirs.push(path.join(x, 'node_modules'));
  });
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
          func = include(self.basedirs, value);
      callback(name, func);
    }
  );
}

module.exports = function (nd) {
  return new Hook(nd);
}

