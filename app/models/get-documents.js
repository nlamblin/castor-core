/* jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , datamodel = require('datamodel')
  , MongoClient = require('mongodb').MongoClient
  , JSONStream = require('JSONStream')
  , es = require('event-stream')
  , EU = require('eu')
  , LRU = require('lru-cache')
  , JBJ = require('jbj')
  , async = require('async')
  , url =require('url')
  , Errors = require('../helpers/errors.js')
  ;

module.exports = function(model) {

  model
 .declare('mongoQuery', function(req, fill) {
      var q = {};
      if (req.routeParams.resourceName === 'index') {
        q = { _name: { $ne: "index" } }
      }
      fill(q);
  })

  return model;
}



