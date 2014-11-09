'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , assert = require('assert')
  ;

function Operators(nd) {
  var self = this;
  self.bank = {}
}

Operators.prototype.use = function (hash, obj)
{
  var self = this;
  if (obj.map && obj.reduce && typeof obj.map === 'function' && typeof obj.reduce === 'function') {
    self.bank[hash] = obj;
  }
  if (!obj.finalize || typeof obj.finalize !== 'function') {
    self.bank[hash]['finalize'] = function(o) { return o;};
  }
  return self;
}
Operators.prototype.get = function ()
{
  var self = this;
  return self.bank;
}
Operators.prototype.keys = function ()
{
  var self = this;
  return Object.keys(self.bank);
}
Operators.prototype.reduce = function (key)
{
  var self = this;
  if (!self.bank[key]) {
    throw new Error('Unknown key : `' + key+'`');
  }
  return self.bank[key].reduce;
}
Operators.prototype.map = function (key)
{
  var self = this;
  if (!self.bank[key]) {
    throw new Error('Unknown key : `' + key+'`');
  }
  return self.bank[key].map;
}
Operators.prototype.finalize = function (key)
{
  var self = this;
  if (!self.bank[key]) {
    throw new Error('Unknown key : `' + key+'`');
  }
  return self.bank[key].finalize;
}


module.exports = new Operators();

