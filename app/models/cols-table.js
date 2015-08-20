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
      fill({
          "name" : req.params.resourcename
      });
  })
  .append('columns', function(req, fill) {
      if (this.mongoCollectionsIndexHandle instanceof Error) {
        return fill();
      }
      this.mongoCollectionsIndexHandle.findOne(this.mongoQuery).then(function(doc) {
          if (doc && doc['_fields']) {
            fill(doc['_fields']);
          }
          else {
            fill(new Error.PropertyNotFound('`_fields` is missing.'));
          }
      }).catch(fill);
  })

  return model;
}



