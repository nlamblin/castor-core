/*jshint node:true, laxcomma:true */
"use strict";

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , assert = require('assert')
  ;

module.exports = function(basedirs, modname) {
  if (modname === undefined) {
    modname = basedirs;
    basedirs = [];
  }
  assert(typeof modname, 'string');
  basedirs = basedirs
  .map(function(basedir) {
    return path.join(basedir, modname);
  });
  basedirs.push(modname);
  var module = basedirs.reduce(function(prev, modir) {
    if (prev !== undefined) {
      return prev;
    }
    try {
      var m = require.resolve(modir);
      return m;
    }
    catch (e) {
      return undefined;
    }
  }, undefined);

  if (module === undefined) {
    throw new Error(util.format('Unknown (or Missing or Error in) Module `%s` (%s)', modname, basedirs.join(', ')));
  }
  else {
    return require(module);
  }
};

