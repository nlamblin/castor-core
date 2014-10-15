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

  if (input.config) {
    delete input.config;
  }

  render.pipe = function(output) {
    output.write(JSON.stringify(input));
    output.end();
  }

  return render;

}
