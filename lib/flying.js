'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:compute:' + basename)
  , assert = require('assert')
  , util = require('util')
  , async = require('async')
  , JBJ = require('jbj')
  , pmongo = require('promised-mongo')

  ;

function Flying(schema, options) {

  options = options || {};

  if (!(this instanceof Flying)) {
    return new Flying(schema, options);
  }
  var self = this;
  self.options = {};
  self.options.collectionName = options.collectionName || '';
  self.options.connexionURI = options.connexionURI || process.env.MONGO_URL;
  self.options.concurrency = options.concurrency || 1;

  self.coll = pmongo(self.options.connexionURI).collection(self.options.collectionName + '_corpus');
}

Flying.prototype.affix = function (keys, data, callback)
{
  var self = this;
  if (!Array.isArray(keys)) {
    keys = [keys];
  }

  keys = keys.filter(function(x) { return (x !== null && x !== undefined); });

  if (keys.length === 0) {
    callback(data);
  }
  else {
    self.coll.find().sort({$natural: -1}).limit(1).toArray().then(function(res) {
      if (Array.isArray(data)) {
        async.map(data, function(item, cb) {
          self.process(keys, item, cb);
        }, function(err, ret) {
          callback(ret);
        });
      }
      else if (typeof data === 'object') {
        self.process(keys, data, function(err, ret) {
          callback(ret);
        });
      }
      else {
        callback(data);
      }
    }).catch(function(err) {
      callback();
    });
  }
}

Flying.prototype.process = function (keys, data, callback)
{
  var self = this;
  keys.forEach(function(key) {
    var r = JBJ.renderSync(key, data);
    if (r !== undefined) {
      data[key] = r;
    }
  });
  callback(null, data);
}

module.exports = Flying;
