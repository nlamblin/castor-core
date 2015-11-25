/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , MongoClient = require('mongodb').MongoClient
  ;


module.exports = function(model) {
  model
  .declare('mongoDatabaseHandle', function(req, fill) {
      MongoClient.connect(req.config.get('connectionURI')).then(fill).catch(fill);
  })
  .declare('indexDescription', function(req, fill) {
      var index = {
        // @todo Idéalement il faudrait inserer ce document avec castor-load
        "fid": "index",       // pour être compatible castor-load
        "number": 0,          // pour être compatible castor-load
        "state": "inserted",  // pour être compatible castor-load
        "_wid": "index",
        "_label": req.config.get('title'),
        "_text": req.config.get('description'),
        "_hash": null,
        "_template": "Empty.",
        "_root": true,
        "_columns" : {
          "_wid" : {
            //
            // Mandatory Column for the reduce system
            //
            "label" : "Identifier",
            "scheme": "http://purl.org/dc/elements/1.1/identifier",
            "comment" : "A mandatory column for \"dollar\" URLs",
            "title" : {
              "get" : "_label"
            }
          },
          "_url" : {
            "label" : "URL",
            "comment" : "Recommended Column to expose existing table",
            "scheme": "http://schema.org/url",
            "type": "http://www.w3.org/TR/xmlschema-2/#anyURI",
            "get": ["baseURL", "_wid"],
            "join": "/",
            "title": {
              "get" : "_wid"
            }
          },
        }
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

