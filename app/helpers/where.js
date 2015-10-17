'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:helpers:' + basename)
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


module.exports = Where;
