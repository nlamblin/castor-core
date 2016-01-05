'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , path = require('path')
  , shorthash = require('short-hash')
  ;

module.exports = function(options) {
  options = options || {};
  return function (input, submit) {
    
    // _wid
    if (input.wid !== undefined) {
      input._wid = input.wid;
      delete input.wid;
    }
    if (input._wid === undefined) {
      input._wid = shorthash(input.fid + input.number);
    }

    // _text
    if (input.text) {
      input._text = input.text;
      delete input.text
    }
    else if (input._text === undefined) {
      input._text = '';
    }

    // _label
    if (input._label === undefined) {
      input._label = 'n/a';
    }


    // _hash
    if (input._hash === undefined) {
      input._hash = null;
    }


    // _content
    if (input.content) {
      input._content = input.content;
      delete input.content
    }
    else if (input._content === undefined) {
      input._content = {};
    }
    submit(null, input);
  }
}
