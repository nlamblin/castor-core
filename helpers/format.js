'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:helpers:' + basename)
  , util = require('util')
  ;

var data = {
  "html" : "text/html",
  "csv" : "text/csv",
  "rss" : "application/rss+xml",
  "atom" : "application/atom+xml",
  "json" : "application/json",
  "xml" : "text/xml"
}
module.exports = function (input) {
    return data[input] ? data[input] : input;
}
