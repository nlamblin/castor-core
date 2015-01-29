'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , path = require('path')
  , JBJ = require('jbj')
  ;
module.exports = function(options) {
  options = options || {};
  options.fieldname = options.fieldname ? options.fieldname : 'documentFields';
  options.stylesheet = options.stylesheet ? options.stylesheet : {};

  if (typeof options.stylesheet !== 'object') {
    options.stylesheet = {};
  }
  return function (input, submit) {
    try {
      input[options.fieldname] = JBJ.render(options.stylesheet);
      submit(null, input);
    }
    catch(e) {
      submit(e);
    }
  }
}
