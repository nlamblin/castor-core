'use strict';

module.exports = function(config) {
  return function(input, is_xhtml) {
    var sub = is_xhtml === true ? '<br/>' : '<br>';
    if (typeof input === 'string') {
      return input.replace(/\n/g, sub);
    }
    return input;
  }
}

