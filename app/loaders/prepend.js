'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , path = require('path')
  ;
module.exports = function(options) {
  options = options || {};
  return function (input, submit) {
    input.name = path.basename(input.location, path.extname(input.location)).replace(/[\_\-\.]+/g, ' ');

    // _text
    if (input.text) {
      input._text = input.text;
      delete input.text
    }
    else if (input._text === undefined) {
      input._text = '';
    }

    // _label
    input._label = 'n/a';

    // _hash
    input._label = null;


    // content
    input.content = input.content || {};
    submit(null, input);
  }
}
