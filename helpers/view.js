"use strict";

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , fs = require('fs')
  ;


module.exports = function(config) {
  var themename, themepath, themefile, themeconf;
  try {
    themename = config.get('theme') || path.join(__dirname, '..', 'themes', 'default');
    themefile = require.resolve(themename);
    themepath = path.dirname(themefile);
    themeconf = require(themefile);
  }
  catch (e) {
    throw new Error(util.format('Unknown (or Missing) Theme `%s`', themename));
  }
  if (typeof themeconf !== 'object') {
    themeconf = {};
  }

  if (Array.isArray(themeconf.browserifyModules)) {
    themeconf.browserifyModules = themeconf.browserifyModules.map(function(modulename) {
        var modulefile, moduledesc = {};
        try {
          modulefile = require.resolve(modulename);
          moduledesc[modulename] = {expose : modulename};
        }
        catch (e) {
          var modulename2 = path.join(themepath, 'node_modules', modulename);
          try {
            modulefile = require.resolve(modulename2);
            moduledesc[modulename2] = {expose : modulename};
          }
          catch (e) {
            // ignore module
          }
        }
        return moduledesc;
      }
    );
  }
  else {
    themeconf.browserifyModules = [];
  }
  config.merge(themeconf);
  return themepath;
}

