'use strict';

var path = require('path')
, basename = path.basename(__filename, '.js')
, debug = require('debug')('castor:upstream:' + basename)
, path = require('path')
, jsel = require('jsel')
;

module.exports = function(config) {
  var fields = config.get('userfields');

  return function (input, output, next) {
    var values = {}, dom = jsel(input);
    if (typeof fields === 'object') {
      Object.keys(fields).forEach(function (key) {
          var xpr = fields[key];
          if (typeof xpr !== 'string' || xpr === '') {
            return;
          }
          var val = dom.selectAll(xpr), vals = dom.select(xpr);
          if (Array.isArray(val)) {
            if (vals.length === 0) {
              values[key] = val;
            }
            else if (vals.length === 1) {
              values[key] = val;
            }
            else {
              values[key] = vals;
            }
          }
          else {
            values[key] = val;
          }
        }
      );
      output['userfields'] = values;
    }
    next();
  }
}
