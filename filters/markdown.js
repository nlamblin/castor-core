'use strict';
var marked = require('marked');

module.exports = function(opts) {
  if (opts) {
    marked.setOptions(opts);
  }
  return function(input) {
    return marked(input);
  }
}

