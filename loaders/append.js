'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , path = require('path')
  , shorthash = require('shorthash')
  ;
module.exports = function(options) {
  options = options || {};
  return function (input, submit) {
    // Short ID
    input.wid = shorthash.unique(input.fid + input.number);
    submit(null, input);
  }
}
