'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:loaders:' + basename)
  , path = require('path')
  , jsel = require('jsel')
  , CSV = require('csv-string')
  ;

module.exports = function(config) {
  var fields = config.get('multivaluedFields')
    , separator = config.get('multivaluedSeparator');

  return function (input, submit) {
    var values = {}
      , dom = jsel(input);
    if (typeof fields === 'object') {
      Object.keys(fields).forEach(function (key) {
        var xpr = fields[key];
        if (typeof xpr !== 'string' || xpr === '') {
          return;
        }
        var newval, vals = dom.selectAll(xpr), val = dom.select(xpr);
        if (Array.isArray(vals)) {
          if (vals.length === 1) {
            values[key] = CSV.parse(val, separator).shift();
          }
        }
        else {
          values[key] =  CSV.parse(val, separator).shift();
        }
      });
      input['multivaluedFields'] = values;
      debug('multivaluedFields', Object.keys(input['multivaluedFields']).map(function(x) { var r = {}; r[x] = input['multivaluedFields'][x].length; return r; }));
    }
    submit(null, input);
  }
}
