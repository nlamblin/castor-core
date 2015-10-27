'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , path = require('path')
  ;
module.exports = function(options) {
  options = options || {};
  return function (input, submit) {
    input.name = path.basename(input.location, path.extname(input.location)).replace(/[\_\-\.]+/g, ' ');
    // Pseudo search
    if (input.text) {
      input._text = input.text;
      delete input.text
    }
    else if (input._text === undefined) {
      input._text = '';
    }
    // For content
    input.content = input.content || {};
    submit(null, input);
  }
}
