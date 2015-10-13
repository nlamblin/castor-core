'use strict';
module.exports = function(options) {
  options = options || {};
  return function (input, submit) {
    input._wid = '';
    if (input.resourceName) {
      input._wid = input._wid.concat(input.resourceName)
    }
    if (input.wid) {
      input._wid = input._wid.concat("/").concat(input.wid)
    }
    submit(null, input)
  }
}
