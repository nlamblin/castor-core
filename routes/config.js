/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , util = require('util')
  , pmongo = require('promised-mongo')
  ;

module.exports = function(config) {
  return function (req, res, next) {
    var conf = config.get();
    delete conf.dataPath;
    delete conf.collectionName;
    delete conf.connexionURI
    delete conf._;
    delete conf.c;
    delete conf.config;
    delete conf.$0;
    conf.theme = path.basename(conf.theme);
    res.json(conf);
  };
};

