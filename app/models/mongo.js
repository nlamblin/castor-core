/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , MongoClient = require('mongodb').MongoClient
  , Errors = require('../helpers/errors.js')
  ;


module.exports = function(model) {
  model
  .declare('mongoDatabaseHandle', function(req, fill) {
      MongoClient.connect(req.config.get('connexionURI')).then(fill).catch(fill);
  })
  .prepend('mongoCollectionsIndexHandle', function(req, fill) {
      if (this.mongoDatabaseHandle instanceof Error) {
        return fill();
      }
      this.mongoDatabaseHandle.collection(req.config.get('collectionsIndexName'), {strict:true}, function(err, coll) {
          if (err) {
            fill(new Errors.CollectionNotFound('`' + req.config.get('collectionsIndexName') +'` missing.'))
          }
          else {
            fill(coll);
          }
      });
  })
  .complete('mongoDatabaseHandle', function(req, fill) {
      if (this.mongoDatabaseHandle instanceof Error || this.mongoCursor !== undefined) {
        return fill(this.mongoDatabaseHandle);
      }
      this.mongoDatabaseHandle.close().then(fill).catch(fill);
  })
  return model;
}

