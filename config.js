'use strict';

var nconf = require('nconf')
  , path = require('path')
  , fs = require('fs')
;

//
// Most of the time you want to pass in a relative path to
// a single config file defaulting to ./library.config.json
//
var options = {
  config: {
    description: 'Config file to load on startup',
    alias: 'c',
    string: true,
    default: path.normalize(path.join(__dirname, '.', 'config.json'))
  }
};

//
// CLI arguments should override.
//
nconf.argv(options).env();

/**
 * Simple configuration fetcher and updater.
 *
 * @constructor
 * @api private
 */
function Configuration() {
  //
  // Now load the file potentially passed in from
  // --config|-c
  //
  nconf.file({ file: this.get('config') });
}

/**
 * Retrieve a value from the configuration.
 *
 * @param
 * @api public
 */
Configuration.prototype.get = function get() {
  return nconf.get.apply(nconf, arguments);
};

/**
 * Set a value to the configuration.
 *
 * @param
 * @api public
 */
Configuration.prototype.set = function set() {
  return nconf.set.apply(nconf, arguments);
};


Configuration.prototype.load = function load(filename) {
  nconf.file({ file: filename});
};

//
// Expose the module as singleton.
//
module.exports = new Configuration;
