/*jshint node:true, laxcomma:true */
"use strict";

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:' + basename)
  , util = require('util')
  , assert = require('assert')
  , Errors = require('../helpers/errors.js')
  ;

module.exports = function(basedirs, modname, req) {
  req = req === false ? false : true;
  if (modname === undefined) {
    modname = basedirs;
    basedirs = [];
  }
  assert(typeof modname, 'string');
  basedirs = basedirs
  .filter(function (basedir) {
    return (typeof basedir === 'string');
  })
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
    throw new Errors.BadConfig(util.format('Unknown (or Missing or Error in) Module `%s` (%s)', modname, basedirs.join(', ')));
  }
  else {
    if (req) {
      return require(module);
    }
    else {
      return module;
    }
  }
};

