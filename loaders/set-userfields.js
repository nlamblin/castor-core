/*jshint node:true, laxcomma:true*/
'use strict';

var path = require('path')
, basename = path.basename(__filename, '.js')
, debug = require('debug')('castor:loaders:' + basename)
, path = require('path')
, objectPath = require('object-path')
;

module.exports = function(config) {
  var fields = config.get('userfields');

  return function (input, submit) {
    var values = {};
    if (typeof fields === 'object') {
      Object.keys(fields).forEach(function (key) {
          var xpr = fields[key].path || fields[key];
          if (typeof xpr !== 'string' || xpr === '') {
            return;
          }
          values[key] = objectPath.get(input, xpr);
        }
      );
      input['userfields'] = values;
    }
    submit(null, input);
  };
};
