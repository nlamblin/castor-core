'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:helpers:' + basename)
  , util = require('util')
  , CSV = require('csv-string')
  , flatten = require('flat')
  ;

module.exports = function (input) {

  var render = function() {}

  render.pipe = function(output) {
    if (Array.isArray(input.data) && input.data[0] && input.data[0].fields) {
      output.write(CSV.stringify(Object.keys(flatten(input.data[0].fields))));
      output.write(input.data.map(function(x) { return CSV.stringify(flatten(x.fields)) }).join(''));
    }
    output.end();
  }

  return render;

}
