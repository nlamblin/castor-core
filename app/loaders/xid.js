'use strict';
var shorthash = require('short-hash');

module.exports = function(options) {
  options = options || {};
  return function (input, submit) {
    input.wid = shorthash(input.fid + input.number);
    submit(null, input);
  }
}
