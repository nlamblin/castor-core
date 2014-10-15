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
nconf.argv(options);
nconf.use('memory');

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
  this.load(this.get('config'));
}

/**
 * Fix value if not exist
 *
 * @param
 * @api public
 */
Configuration.prototype.fix = function fix(name, value) {
  return nconf.set(name, nconf.get(name) || value);
};


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


/**
 * unSet a value to the configuration.
 *
 * @param
 * @api public
 */
Configuration.prototype.unset = function unset() {
  return nconf.set.apply(nconf, undefined);
};



Configuration.prototype.load = function load(filename) {
  if (fs.existsSync(filename)) {
    nconf.file({ file: filename});
  }
};

Configuration.prototype.merge = function merge(obj) {
  nconf.overrides(obj);
};

Configuration.prototype.expose = function expose(obj) {
  var conf = this.get();
  delete conf.dataPath;
  delete conf.collectionName;
  delete conf.connexionURI
  delete conf._;
  delete conf.c;
  delete conf.config;
  delete conf.$0;
  conf.theme = path.basename(conf.theme);
  return conf;
};




//
// Expose the module as singleton.
//
module.exports = new Configuration();
