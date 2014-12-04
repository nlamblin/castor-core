'use strict';
var marked = require('marked');

module.exports = function(config) {
  var opts = config.get('markdown');
  if (opts) {
    marked.setOptions(opts);
  }
  return function(input) {
    return marked(input);
  }
}

