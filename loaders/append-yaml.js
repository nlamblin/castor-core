'use strict';

var path = require('path')
, basename = path.basename(__filename, '.js')
, debug = require('debug')('filerake:middleware:' + basename)
, path = require('path')
, fs = require('fs')
, yaml = require('js-yaml')
, extend = require('extend')
;


module.exports = function (config) {

  var options = {
    "name" : "__metadata.yml",
    "encoding" : "utf8",
    "schema" : "JSON_SCHEMA"
  }

  return function (doc, next) {

    var fn = '';

    if (doc.type === 'directory') {
      fn = path.join(doc.location, options.name);
    }
    else if (doc.type === 'file') {
      fn = doc.location.concat(options.name);
    }

    fs.readFile(fn, {flag: 'r', encoding: options.encoding }, function (err, data) {
        if (err) {
          next();
        }
        else {
          try {
            var nd = yaml.safeLoad(data, false, options.schema);
            extend(nd, doc);
            extend(true, doc, nd);
            next();
          } catch (err) {
            next(err);
          }
        }
      }
    );
  };
}
