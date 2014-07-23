'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , config  = require('../config.js')
  , pmongo = require('promised-mongo')
  , coll = pmongo(config.get('connexionURI')).collection(config.get('collectionName'))
  ;

function Docs() {}

Docs.prototype.onfetch = function (spark, selector, fn) {
  debug('selector', selector);
  fn('Docs selector : ' + selector);
};

module.exports = new Docs ()
