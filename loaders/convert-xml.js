'use strict';

var path = require('path')
, basename = path.basename(__filename, '.js')
, debug = require('debug')('castor:loaders:' + basename)
, path = require('path')
, fs = require('fs')
, xm = require('xml-mapping')
;


module.exports = function(config) {

  var options = config.get('loaders:'+basename) || {};
  options.specialChar = '#';
  options.throwErrors = false;
  options.longTag = options.longTag ? options.longTag : true;
  options.nested = options.nested ? options.nested : true;
  options.comments = options.comments ? options.comments : false;
  options.parserInfos = options.parserInfos ? options.parserInfos : false;

  return function (input, output, next) {

    fs.readFile(input.location, function (err, xml) {
        if (err) {
          return next(err);
        }
        output['content']['json'] = xm.load(xml.toString(), options);
        next();
      }
    );
  }
}
