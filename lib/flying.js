'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:compute:' + basename)
  , assert = require('assert')
  , util = require('util')
  , async = require('async')
  , JBJ = require('jbj')
  , extend = require('extend')
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
  self.schema = schema;

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
          var doc = {};
          extend(doc, res, item);
          self.process(keys, doc, cb);
        }, function(err, ret) {
          callback(ret);
        });
      }
      else if (typeof data === 'object') {
        var doc = {};
        extend(doc, res, data);
        self.process(keys, doc, function(err, ret) {
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
    if (self.schema[key]) {
      var r = JBJ.renderSync(self.schema[key], data);
      if (r !== undefined) {
        data[key] = r;
      }
    }
  });
  callback(null, data);
}

module.exports = Flying;
