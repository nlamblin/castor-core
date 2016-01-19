/*jshint node:true, laxcomma:true*/
"use strict";

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , fs = require('fs')
  , include = require('../helpers/include.js')
  ;


module.exports = function(config) {

  var themename;
  if (config.has('theme')) {
    themename = config.get('theme')
  }
  else if (config.has('viewPath')) {
    themename = config.get('viewPath')
  }
  else {
    themename =  'views';
  }
  var themedirs = [
        process.cwd(),
        process.env.HOME,
        path.resolve(__dirname, '..', 'views')
      ]
    , themefile = include(themedirs, themename, false)
    , themepath = path.dirname(themefile)
    , themeconf = require(themefile) || {}
    , themepack = path.join(themepath, 'package.json')
    ;

  if (fs.existsSync(themepack)) {
    config.set('package', require(themepack));
  }
  if (Array.isArray(themeconf.browserifyModules)) {
    var browserifyDirs = [
      path.join(themepath, 'node_modules')
    ];

    themeconf.browserifyModules = themeconf.browserifyModules.map(function(modulename) {
        var modulefile, moduledesc = {};
        modulefile = include(browserifyDirs, modulename, false);
        moduledesc[modulefile] = {expose : modulename};
        return moduledesc;
      }
    );
  }
  else {
    themeconf.browserifyModules = [];
  }
  config.merge(themeconf);
  return themepath;
};
