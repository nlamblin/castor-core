'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , assert = require('assert')
  ;

module.exports = function (options, name, callback)
{
  assert(options);
  assert(name);

  if (!callback) {
    callback = name;
    name = "middlewares";
  }
  if (!options[name]) {
    options[name] = {};
  }
  Object.keys(options[name]).sort().forEach(function (key) {
      var name = key.split('-').pop(),
          opt = options[name] || {},
          mdl = options[name][key];
      if (typeof mdl === 'string') {
        try {
          var func = require(path.resolve(process.cwd() || __dirname, mdl));
          callback(func(opt), name);
          debug('Loaded', name);
        }
        catch (e) {
          debug('Ignored', name);
        }
      }
      else if (typeof mdl === 'function') {
        callback(mdl(opt), name);
        debug('Loaded', name);
      }
      else {
        debug('Ignored', name);
      }
    }
  );
}

