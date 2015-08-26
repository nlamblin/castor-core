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
  .append('table', function(req, fill) {
      if (this.mongoCollectionsIndexHandle instanceof Error) {
        return fill();
      }
      this.mongoCollectionsIndexHandle.findOne({
          "_name" : req.routeParams.resourceName
      }).then(function(doc) {
          if (!doc) {
            fill(new Errors.TableNotFound('The table does not exist.'));
          }
          else if (!doc['_fields']) {
            fill(new Error.PropertyNotFound('`_fields` is missing.'));
          }
          else {
            fill(doc);
          }
      }).catch(fill);
  })

  return model;
}



