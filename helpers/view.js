"use strict";

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , fs = require('fs')
  , config  = require('../config.js')
  ;

var themename = config.get('theme') || path.join(__dirname, '..', 'themes', 'default'),
    themepath,
    themeconf;

try {
  themepath = require.resolve(themename);
  themeconf = require(themepath);
  themepath = path.dirname(themepath);
}
catch (e) {
  throw new Error(util.format('Unknown (or Missing) Theme `%s`', themename));
}
if (typeof themeconf !== 'object') {
  themeconf = {};
}

if (Array.isArray(themeconf.browserifyModules)) {
  themeconf.browserifyModules = themeconf.browserifyModules.map(function(i) {
      var modulepath, moduledesc = {};
      try {
        modulepath = require.resolve(i);
      }
      catch (e) {
        modulepath = path.join(themepath, 'node_modules', i);
      }
      moduledesc[modulepath] = {expose : i};
      return moduledesc;
    }
  );
}
else {
  themeconf.browserifyModules = [];
}

config.merge(themeconf);

module.exports = function(filename) {
  return path.join(themepath, filename || '');
}

