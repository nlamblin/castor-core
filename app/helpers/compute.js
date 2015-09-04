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
  , pmongo = require('promised-mongo')
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
  self.options.connexionURI = options.connexionURI || process.env.MONGO_URL;
  self.options.concurrency = options.concurrency || 1;
  self.options.port = options.port || 80;

  self.coll1 = pmongo(self.options.connexionURI).collection(self.options.collectionName);
  self.coll2 = pmongo(self.options.connexionURI).collection(self.options.collectionName + '_corpus');
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

  /*
  function internal(urlObj, callback) {
    var ope = self.bank[path.basename(urlObj.host)];
    var field = querystring.parse(urlObj.query).field;
    var fields = Array.isArray(field) ? field : new Array(field);
    var map = ope.map;
    var reduce = ope.reduce;
    var opts = {
      out: {
        inline:1
      },
      query: {},
      scope: {
        exp : fields
      }
    };
    console.log('compute', urlObj, opts);
    self.coll1.mapReduce(map, reduce, opts).then(function(coll) {
      if (coll.find) {
        coll.find().toArray(function(err, res) {
          callback(null, res);
        });
      }
      else {
        callback(new Error('M/R have no result'));
      }
    }).catch(function(err) {
      callback(err);
    });
  }
  JBJ.register('compute:', internal);
  */

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
  JBJ.render(self.schema, {}, function(err, fields) {
    debug('jbj', err, fields);
    if (err) {
      cb(err);
    }
    else {
      fields.computedDate = new Date();
      self.coll2.insert(fields, {w:1}, cb);
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
