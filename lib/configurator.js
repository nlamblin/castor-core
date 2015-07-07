/*jshint node:true,laxcomma:true*/
'use strict';

var path   = require('path')
  , extend = require('extend')
  , objectPath = require("object-path");
  ;
function Configurator() {

    if (!(this instanceof Configurator)) {
        return new Configurator();
    }
    this.config = {};
}

Configurator.prototype.fix = function fix(name, value) {
  this.config[name] = value;
};

Configurator.prototype.get = function get(path) {
  return objectPath.get(this.config, path);
};

Configurator.prototype.set = function set(path, value) {
  objectPath.set(this.config, path, value);
};

Configurator.prototype.unset = function unset(path) {
  objectPath.del(this.config, path);
};

Configurator.prototype.load = function load(appname, customArgvParser) {
  this.conf = require('rc')(appname, this.conf, customArgvParser);
};

Configurator.prototype.expose = function expose() {
  var conf = clone(this.conf);
  delete conf.dataPath;
  delete conf.collectionName;
  delete conf.connexionURI;
  delete conf._;
  delete conf.configs;
  delete conf.$0;
  return conf;
};

module.exports = Configurator;
