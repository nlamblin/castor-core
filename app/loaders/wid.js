'use strict';
var shorthash = require('short-hash');

module.exports = function(options) {
  options = options || {};
  return function (input, submit) {
    if (input.wid !== undefined) {
      input._wid = input.wid;
      delete input.wid;
    }
    if (input._wid === undefined) {
      input._wid = shorthash(input.fid + input.number);
    }
    submit(null, input);
  }
}
