/*jshint node:true, laxcomma:true*/
'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , path = require('path')
  , JBJ = require('jbj')
  , objectPath = require('object-path')
  ;

module.exports = function(options) {
  options = options || {};
  options.stylesheet = options.stylesheet ? options.stylesheet : {};

  if (typeof options.stylesheet !== 'object') {
    options.stylesheet = {};
  }
  return function (input, submit) {
    var res = JBJ.renderSync(options.stylesheet, input);
    // Truncate all indexed documentFields
    for (var field in options.stylesheet) {
      if (!options.stylesheet[field].noindex) {
        field = field.slice(1);
        var value = objectPath.get(res, field);
        if (typeof value === 'string') {
          objectPath.set(res,field,value.slice(0,1000));
        }
      }
    }
    console.log('res',res.text);
    submit(null, res);
  };
};
