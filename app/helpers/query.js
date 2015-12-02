'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:helpers:' + basename)
  , CSV = require('csv-string')
  ;


function getOrder(input) {
  var sign = String(input).trim().toLocaleLowerCase();
  if (sign === 'asc') {
    return 1
  }
  else if (sign === 'desc') {
    return -1
  }
  else {
    return 1
  }
}
function getOperator(input) {
  var sign = String(input).trim();
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
}


function Query(options)
{
  if (!(this instanceof Query)) {
    return new Query(options);
  }
  this.options = options;
  this.query = {};
}
Query.prototype = {
  where : function (str) {
    var q = {};
    var input = CSV.parse(String(str || ''), ' ');
    if (Array.isArray(input) && input[0].length === 3) {
      var w = input[0];
      var o = getOperator(w[1]);
      q[w[0]] = {};
      q[w[0]][o] = w[2];
    }
    this.query['$query'] = q;
    return this;
  },
  orderBy : function (str) {
    var q = [];
    var input = CSV.parse(String(str || ''), ' ');
    if (Array.isArray(input) && Array.isArray(input[0])) {
      q.push([input[0][0], getOrder(input[0][1])]);
    }
    this.query['$orderby'] = q;
    return this;
  },
  get: function (key) {
    if (key === undefined) {
      return this.query;
    }
    else {
      return  this.query[key];
    }
  }
}

module.exports = Query;


