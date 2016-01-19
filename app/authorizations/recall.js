'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:access:' + basename)
  ;

module.exports = function(options) {
  options = options || {};
  return function (req, authorize) {
    debug('control', req.headers, Object.keys(req.headers), req.headers.host.indexOf('127.0.0.1'));
    if (Object.keys(req.headers).length === 2 && req.headers.host.indexOf('127.0.0.1') === 0) {
      authorize(null, true);
    }
    else {
      authorize();
    }
  }
}
