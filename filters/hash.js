'use strict';

module.exports = function(config) {
  return function(input, algorithm) {
    return require('crypto').createHash(algorithm || 'sha1').update(input.toString()).digest('hex');
  }
}

