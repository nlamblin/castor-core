'use strict';
var shorthash = require('shorthash');

module.exports = function(options) {
  options = options || {};
  return function (input, submit) {
    input.wid = shorthash.unique(input.fid + input.number);
    submit(null, input);
  }
}
