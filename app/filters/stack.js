'use strict';

module.exports = function(config) {
  return function(input) {
    return Array.prototype.slice.call(arguments);
  }
}

