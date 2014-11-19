"use strict";
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
  self.hooks = [];
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
  if (Array.isArray(object)) {
    self.hooks = object;
  }
  else {
    Object.keys(object).sort().forEach(function (key) {
      self.hooks.push({
        _id: key.split('-').pop(),
        value: object[key]
      });
    });
  }
  return self;
}

Hook.prototype.apply = function (callback)
{
  var self = this;
  assert.equal(typeof callback, 'function');
  self.hooks.forEach(function (item) {
    var name, func;
    if (typeof item === 'string') {
      func = item;
    }
    else if (typeof item === "object") {
      name = item._id;
      func = item.script || item.value;
    }
    if (func !== undefined) {
      callback(name, include(self.basedirs, func), item);
    }
  });
}

module.exports = function (nd) {
  return new Hook(nd);
}

