
/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , MongoClient = require('mongodb').MongoClient
  , JSONStream = require('JSONStream')
  , Errors = require('../errors.js')
  ;

module.exports = function(model) {
  model
    .declare('mongoQuery', function(req, fill) {
        var q = {};
      if (req.routeParams.resourceName === 'index') {
        q = { _name: { $ne: "index" } }
      }
      else {
        q = { _name : req.routeParams.resourceName + "/" + req.routeParams.documentName }
      }
      fill(q);
  })

  return model;
}



