'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:compute:' + basename)
  , assert = require('assert')
  , util = require('util')
  , events = require('events')
  , JBJ = require('jbj')
  , pmongo = require('promised-mongo')
  ;

function Compute(schema, options) {

  options = options || {};

  if (!(this instanceof Compute)) {
    return new Compute(schema, options);
  }
  events.EventEmitter.call(this);
  var self = this;
  self.options = {};
  self.options.collectionName = options.collectionName || '';
  self.options.connexionURI = options.connexionURI || process.env.MONGO_URL;
  self.options.concurrency = options.concurrency || 1;

  self.coll = pmongo(self.options.connexionURI).collection(self.options.collectionName + '_corpus');
  self.schema = schema;
  self.bank = {};
}

util.inherits(Compute, events.EventEmitter);

Compute.prototype.use = function (hash, obj)
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

Compute.prototype.run = function (cb)
{
  var self = this;
  debug('run');
  JBJ.render(self.schema, {}, function(err, fields) {
    if (err) {
      cb(err);
    }
    else {
      fields.computedDate = new Date();
      self.coll.insert(fields, {w:1}, cb);
    }
  });
}

Compute.prototype.operators = function ()
{
  var self = this;
  return Object.keys(self.bank);
}

Compute.prototype.operator = function (key)
{
  var self = this;
  if (!self.bank[key]) {
    throw new Error('Unknown key : `' + key+'`');
  }
  return self.bank[key];
}

module.exports = Compute;
