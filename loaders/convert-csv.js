'use strict';

var path = require('path')
, basename = path.basename(__filename, '.js')
, debug = require('debug')('castor:loaders:' + basename)
, path = require('path')
, clone = require('clone')
, fs = require('fs')
, CSV = require('csv-string')
;

module.exports = function(config) {

  var options = {
    separator : config.get('csvSeparator')
  };

  return function (input, output, next) {

    var columns = []
      , docs = []
      , stream = fs.createReadStream(input.location, {encoding: config.get('csvEncoding')})
      , parser = CSV.createStream(options);

    parser.on('data', function (row) {
        if (columns.length === 0) {
          columns = row;
        }
        else {
          var doc = clone(input, false);
          doc.content = {};
          doc.content.json = {};
          columns.forEach(function(x, i) {
              doc.content.json[x] = row[i];
            }
          );
          docs.push(doc);
        }
      }
    );
    parser.on('end', function() {
        if (docs.length > 0) {
          next(null, docs);
        } else {
          next(new Error('No line detected !'), input);
        }
      }
    );
    parser.on('error', function(e) {
        next(e, input);
      }
    )

    stream.pipe(parser);
  }
}
