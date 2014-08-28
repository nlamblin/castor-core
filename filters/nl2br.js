'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:filters:' + basename)
  ;

module.exports = function(config) {
  return function(input, is_xhtml) {
    var sub = is_xhtml === true ? '<br/>' : '<br>';
    if (typeof input === 'string') {
      return input.replace(/\n/g, sub);
    }
    return input;
  }
}

