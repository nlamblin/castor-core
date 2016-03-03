'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:helpers:' + basename)
  ;

module.exports = function mq(qry, key, def) {
  var res;
  if (qry[key] !== undefined) {
    res = qry[key];
  }
  else {
    res = def;
  }
  // debug('mongoQuery from', qry, 'search', key, 'found', qry[key], 'return', res);
  return res;
}

