'use strict';

var path = require('path')
, basename = path.basename(__filename, '.js')
, debug = require('debug')('filerake:middleware:' + basename)
, path = require('path')
, fs = require('fs')
, xm = require('xml-mapping')
, extend = require('extend')
, config  = require('../config.js')
;


module.exports = function (input, output, next) {

  var options = {
    throwErrors: false,
    nested : false,
    comments : false,
    specialChar: '#',
    longTag: true
  };
  fs.readFile(input.location, function (err, xml) {
      if (err) {
        return next(err);
      }
      extend(output, input);
      output['@content']['application/json'] = xm.load(xml.toString(), options);
      next();
    }
  );
}
