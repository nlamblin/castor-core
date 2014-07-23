'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , config  = require('../config.js')
  , datamodel = require('datamodel')
  , render = require('../helpers/render.js')
  , pmongo = require('promised-mongo')
  , coll = pmongo(config.get('connexionURI')).collection(config.get('collectionName'))
  , nPerPage = config.get('itemsPerPage') || 30
  ;

datamodel()
.declare('url', function(req, fill) {
    fill(require('url').parse(req.protocol + '://' + req.get('host') + req.originalUrl));
})
.send(function(res, next) {
    res.type('text/plain');
    res.render('robots.txt', this);
  }
)
.attach(module);

