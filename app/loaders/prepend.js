'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , path = require('path')
  , fs = require('fs')
  , prettysize = require('prettysize')
  , mimetype = require('mimetype')
  ;
module.exports = function(options) {
  options = options || {};
  return function (input, submit) {
    // https://schema.org/fileSize
    input.fileSize = prettysize(input.filesize);
    // https://schema.org/fileFormat
    input.fileFormat = mimetype.lookup(input.location) || undefined;
    // https://schema.org/name
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
