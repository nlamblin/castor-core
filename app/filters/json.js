'use strict';

module.exports = function(config) {
  return function(input) {
    return JSON.stringify(input);
  }
}

