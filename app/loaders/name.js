'use strict';
var shorthash = require('shorthash');

module.exports = function(options) {
  options = options || {};
  return function (input, submit) {
    input._name = '';
    if (input.resourceName) {
      input._name = input._name.concat(input.resourceName)
    }
    if (input.wid) {
      input._name = input._name.concat("/").concat(input.nid)
    }
    submit(null, input)
  }
}
