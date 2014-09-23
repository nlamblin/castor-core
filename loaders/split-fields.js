/*jshint node:true, laxcomma:true*/
'use strict';

var path     = require('path')
  , basename = path.basename(__filename, '.js')
  , debug    = require('debug')('castor:loaders:' + basename)
  , path     = require('path')
  , objectPath = require('object-path')
  , CSV      = require('csv-string')
  ;

var trimString = function trimString(str) {
  if (typeof str !== 'string') {
    return str;
  }
  return str.trim();
};

module.exports = function(config) {
  var fields    = config.get('multivaluedFields')
    , separator = config.get('multivaluedSeparator');

  return function (input, submit) {
    var values = {};
    if (typeof fields === 'object') {
      Object.keys(fields).forEach(function (key) {
        var xpr = fields[key];
        if (typeof xpr !== 'string' || xpr === '') {
          return;
        }
        var vals = objectPath.get(input, xpr);
        if (vals) {
          values[key] = CSV.parse(vals, separator).shift().map(trimString);
        }
        else {
          values[key] = [];
        }
      });
      input['multivaluedFields'] = values;
      debug('multivaluedFields', Object.keys(input['multivaluedFields']).map(function(x) { var r = {}; r[x] = input['multivaluedFields'][x].length; return r; }));
    }
    submit(null, input);
  };
};
