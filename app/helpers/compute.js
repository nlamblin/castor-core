/*jshint node:true,laxcomma:true*/
'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:compute:' + basename)
  , assert = require('assert')
  , url = require('url')
  , querystring = require('querystring')
  , util = require('util')
  , events = require('events')
  , JBJ = require('jbj')
  , MongoClient = require('mongodb').MongoClient
  ;

function request(urlObj, callback) {
  var options = {
    url: urlObj
  };
  if (urlObj.hostname === '127.0.0.1' || urlObj.hostname === 'localhost') {
    options.proxy = null;
  }
  require('request')(options, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      callback(null, body);
    }
    else {
      console.log("err", error, response);
      callback(new Error('Request failed'));
    }
  });
}


function Compute(schema, options) {

  options = options || {};

  if (!(this instanceof Compute)) {
    return new Compute(schema, options);
  }
  events.EventEmitter.call(this);
  var self = this;
  self.options = {};
  self.options.collectionName = options.collectionName || '';
  self.options.connectionURI = options.connectionURI || process.env.MONGO_URL;
  self.options.concurrency = options.concurrency || 1;
  self.options.port = options.port || 80;

  self.schema = schema;
  self.bank = {};




  function local(urlObj, callback) {
    urlObj.protocol = 'http:';
    urlObj.host = '127.0.0.1';
    urlObj.port = self.options.port;
    try {
      var buf = '', req = require('http').get(urlObj, function(res) {
          if (res.statusCode !== 200) {
            return callback(new Error('HTTP Error ' + res.statusCode));
          }
          res.setEncoding('utf8');
          res.on('data', function (chunk) {
              buf += chunk.toString();
          });
          res.on('error', callback);
          res.on('end', function() {
              callback(null, buf);
          });
      });
      req.on('error', callback);
    }
    catch(e) {
      callback(e);
    }
  }

  JBJ.register('local:', local);
  JBJ.register('http:', request);
  JBJ.register('https:', request);
}

util.inherits(Compute, events.EventEmitter);

Compute.prototype.use = function (hash, obj)
{
  var self = this;
  if (obj.map && obj.reduce && typeof obj.map === 'function' && typeof obj.reduce === 'function') {
    self.bank[hash] = obj;
  }
  return self;
};

Compute.prototype.run = function (cb)
{
  var self = this;
  debug('run', self.schema);
  if (typeof self.schema !== 'object' || self.schema === null || self.schema === undefined) {
    return cb(new Error('Invalid JBJ schema'));
  }
  if (Object.keys(self.schema).length === 0) {
    return cb();
  }
  JBJ.render(self.schema, {}, function(err, fields) {
    debug('jbj', err, fields);
    if (err) {
      cb(err);
    }
    else {
      fields.computedDate = new Date();
      MongoClient.connect(self.options.connectionURI).then(function(db) {
        db.collection(self.options.collectionName + '_corpus').then(function(coll) {
            coll.insert(fields, {w:1}, cb);
            return;
        }).catch(cb);
    }).catch(cb);

    }
  });
};

Compute.prototype.operators = function ()
{
  var self = this;
  return Object.keys(self.bank);
};

Compute.prototype.operator = function (key)
{
  var self = this;
  if (!self.bank[key]) {
    throw new Error('Unknown key : `' + key+'`');
  }
  return self.bank[key];
};

module.exports = Compute;
