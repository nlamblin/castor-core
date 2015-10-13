/* jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , CSV = require('csv-string')
  ;
function Where(input)
{
  if (!(this instanceof Where)) {
    return new Where(input);
  }
  this.where = input;
}
Where.prototype = {
  getOperator : function(input) {
    var sign = input.trim();
    if (sign === '=') {
      return '$eq'
    }
    else if (sign === '<') {
      return '$lt'
    }
    else if (sign === '>') {
      return '$gt'
    }
    else {
      return '$eq'
    }
  },
  parse: function (str) {

    var q = {};
    var where = CSV.parse(String(str || ''), ' ');
    if (Array.isArray(where) && where[0].length === 3) {
      var w = where[0];
      var o = this.getOperator(w[1]);
      q[w[0]] = {};
      q[w[0]][o] = w[2];
    }
    return q;
  }
}

module.exports = function(model) {
  if (model === undefined) {
    model = require('datamodel')();
  }
  model
  .declare('collectionName', function(req, fill) {
      if (req.routeParams.resourceName === 'index') {
        fill(req.config.get('collectionsIndexName'))
      }
      else {
        fill(req.routeParams.resourceName);
      }
  })
  .declare('mongoQuery', function(req, fill) {
      var w = new Where()
      var q = w.parse(req.query.where);
      if (req.routeParams.resourceName === 'index') {
        q = { _wid: { $ne: "index" } }
      }
      fill(q);
  })
  .append('mongoCursor', function(req, fill) {
      if (this.mongoDatabaseHandle instanceof Error) {
        return fill();
      }
      debug('mongoCursor on `' + this.collectionName + '`', this.mongoQuery);
      fill(this.mongoDatabaseHandle.collection(this.collectionName).find(this.mongoQuery));
  })


  return model;
}



