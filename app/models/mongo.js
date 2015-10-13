/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , MongoClient = require('mongodb').MongoClient
  , Errors = require('../helpers/errors.js')
  ;


module.exports = function(model) {
  model
  .declare('mongoDatabaseHandle', function(req, fill) {
      MongoClient.connect(req.config.get('connectionURI')).then(fill).catch(fill);
  })
  .declare('indexDescription', function(req, fill) {
      var index = {
        // @toto Idéalement il faudrait inserer ce document avec castor-load
        "fid": "index",   // pour être compatible castor-load
        "number": 0,      // pour être compatible castor-load
        "_wid": "index",
        "_columns" : [
          //
          // Mandatory Column for the reduce system
          //
          {
            "propertyScheme": "http://schema.org/name",
            "propertyValue" : {
              "get" : "title"
            },
            "propertyName" : "name",
            "propertyLabel" : "Name",
            "propertyComment" : "A mandatory column for \"dollar\" URLs"
          },
          //
          // Recommended Column to expose existing table
          //
          {
            "propertyScheme": "http://schema.org/url",
            "propertyType": "http://www.w3.org/TR/xmlschema-2/#anyURI",
            "propertyValue" : {
              "get": ["baseURL", "_wid"],
              "join": "/"
            },
            "propertyText" : {
              "get" : "_wid",
            },
              "propertyName" : "url",
              "propertyLabel" : "URL",
              "propertyComment" : ""
            }
          ],
          //
          // Table metadata
          //
          "title": req.config.get('title'),
          "description": req.config.get('description')
        };
        fill(index);
    })
  .prepend('mongoCollectionsIndexHandle', function(req, fill) {
      var self = this;
      if (self.mongoDatabaseHandle instanceof Error) {
        return fill();
      }
      self.mongoDatabaseHandle.collection(req.config.get('collectionsIndexName'), {strict:true}, function(err, coll) {
          if (err) {
            debug('Try to init index', req.config.get('collectionsIndexName'));
            self.mongoDatabaseHandle.collection(req.config.get('collectionsIndexName'), function(err, newcoll) {
                newcoll.insertOne(self.indexDescription).then(function() {
                    self.mongoDatabaseHandle.createIndex(req.config.get('collectionsIndexName'),
                      {_wid:1},
                      {unique:true, background:false, w:1}
                    ).then(function() {
                        fill(newcoll);
                    }).catch(fill);
                }).catch(fill);
            });
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

