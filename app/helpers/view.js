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

  var themefile, themedirs = []
  if (config.has('theme')) {
    themedirs.push(config.get('theme'));
  }
  else if (config.has('viewPath')) {
    themedirs.push(config.get('viewPath'))
  }
  themedirs.push(process.cwd());
  themedirs.push(process.env.HOME);
  themedirs.push(path.resolve(__dirname, '..', 'views'));

  try {
    themefile = include(themedirs, 'castor.js', false)
  }
  catch(e) {
  }
  if (themefile === undefined) {
    themefile = include(themedirs, 'index.js', false)
  }

  var themepath = path.dirname(themefile)
    , themepack = path.join(themepath, 'package.json')
    , themeconf = require(themefile) || {}
    ;

  if (fs.existsSync(themepack)) {
    config.set('package', require(themepack));
  }
  if (Array.isArray(themeconf.browserifyModules)) {
    var browserifyDirs = [
      path.join(themepath, 'node_modules'),
      themepath
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
