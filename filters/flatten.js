'use strict';
var flatten = require('flat');

module.exports = function(config) {
  return function(input) {
    return flatten(arguments);
  }
}

