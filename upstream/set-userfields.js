'use strict';

var path = require('path')
, basename = path.basename(__filename, '.js')
, debug = require('debug')('castor:upstream:' + basename)
, path = require('path')
, extend = require('extend')
, jsel = require('jsel')
;

module.exports = function(config) {
  var values = {}, fields = config.get('userfields');

  return function (input, output, next) {
    extend(output, input);
    var dom = jsel(input);
    if (typeof fields === 'object') {
      Object.keys(fields).forEach(function (key) {
          var xpr = fields[key];
          var val = typeof xpr === 'string' && xpr !== '' ? dom.selectAll(xpr) : undefined;
          if (Array.isArray(val)) {
            if (val.length === 0) {
              values[key] = undefined;
            }
            else if (val.length === 1) {
              values[key] = val.pop();
            }
            else {
              values[key] = val;
            }
          }
          else {
            values[key] = undefined;
          }
        }
      );
      output['userfields'] = values;
    }
    next();
  }
}
