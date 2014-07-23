"use strict";

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , fs = require('fs')
  , config  = require('../config.js')
  ;

var themename = config.get('theme') || "default",
    themepath = path.join(__dirname, '..', 'themes', themename);

if (!fs.existsSync(themepath)) {
  throw new Error(util.format('Unknown (or Missing) Theme `%s`', themename)); 
}

module.exports = function(filename) {
  return path.join(themepath, filename || '');
}

