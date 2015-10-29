/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , datamodel = require('datamodel')
  , assert = require('assert')
  , async = require('async')
  ;

module.exports = function(model) {

  model
  .declare('property', function(req, fill) {
      var Errors = req.config.get('Errors');
      debug('req.body', req.body);
      var property = {
        name: req.routeParams.resourceName
      };
      if (req.body && req.body.name && req.body.name === 'index') {
        property.previousName = req.routeParams.resourceName;
        property.name = req.routeParams.resourceName;
        property.title = req.body.title;
        property.description= req.body.description || '';
      }
      else if (req.body && req.body.name && req.body.name !== 'index') {
        property.previousName = req.routeParams.resourceName;
        property.name = req.body.name || '';
        property.title = req.body.title;
        property.description= req.body.description || '';
      }
      else if (req.body && req.body[req.routeParams.resourceName] == 'true' &&  req.routeParams.resourceName !== 'index') {
        property.name = false;
        property.previousName = req.routeParams.resourceName;
      }
      else if (req.body) {
        property = false;
      }
      else {
        return fill(new Errors.InvalidParameters('Some parameters is missing.'));
      }
      debug('property', property);
      fill(property);
  })
   .declare('doc', function(req, fill) {
       fill({
           // @todo Idéalement il faudrait inserer ce document avec castor-load
           "fid": req.routeParams.resourceName,       // pour être compatible castor-load
           "number": 0,          // pour être compatible castor-load
           "state": "inserted",  // pour être compatible castor-load
          "_wid": req.routeParams.resourceName,
          "_label": "Table "+req.routeParams.resourceName,
          "_text": "Undefined description.",
          "_hash": null,
          "_columns" : {
            "_wid" : {
              //
              // Mandatory Column for the reduce system
              //
              "label" : "Identifier",
              "scheme": "http://purl.org/dc/elements/1.1/identifier",
              "comment" : "A mandatory column for \"dollar\" URLs"
            },
            "_url" : {
              "label" : "URL",
              "comment" : "Recommended Column to expose existing table",
              "scheme": "http://schema.org/url",
              "type": "http://www.w3.org/TR/xmlschema-2/#anyURI",
              "get": ["baseURL", "_index", "_wid"],
              "join": "/",
              "title": {
                "get" : ["_index", "_wid"],
                "join" : "/"
              }
            }
          }
      });
  })
  .append('mongoResult', function(req, fill) {
      var self = this, query, operation;
      if (self.mongoDatabaseHandle instanceof Error) {
        return fill([]);
      }

      if (self.property && self.property.name === false && self.property.previousName !== 'index') {
        query = {
          _wid: self.property.previousName
        }
        self.mongoCollectionsIndexHandle.deleteOne(query).then(function(r) {
            self.mongoDatabaseHandle.listCollections({name: self.property.previousName}).next().then(function(collinfo) {
                self.mongoDatabaseHandle.dropCollection(self.property.previousName).catch(function(e) {
                    console.warn(e.toString(), self.property.previousName);
                });
                fill(r);
            }).catch(function(e) {
                // nothing to do
                fill(null);
            });
        }).catch(fill);
      }
      else if (self.property && self.property.name === self.property.previousName) {
        query = {
          _wid: self.property.name
        };
        operation = {
          $set:{
            _label : self.property.title,
            _text  : self.property.description
          }
        };
        debug('update table', query, operation);
        self.mongoCollectionsIndexHandle.updateOne(query, operation).then(fill).catch(fill);
      }
      else if (self.property && self.property.name !== self.property.previousName  && self.property.previousName !== 'index') {
        query = {
          _wid: self.property.previousName
        };
        operation = {
          $set:{
            _wid: self.property.name,
            _label : self.property.title,
            _text  : self.property.description
          }
        }
        debug('rename table', query, operation);
        self.mongoCollectionsIndexHandle.updateOne(query, operation).then(function(r) {
            self.mongoDatabaseHandle.listCollections({name: self.property.previousName}).next().then(function(collinfo) {
                self.mongoDatabaseHandle.renameCollection(self.property.previousName, self.property.name).catch(function(e) {
                    console.warn(e.toString(), self.property.previousName);
                });
                fill(r);
            })
            .catch(function(e) {
                // nothing to do
                fill(null);
            });
        }).catch(fill);
      }
      else {
        debug('add table', query, operation);
        self.mongoCollectionsIndexHandle.insertOne(self.doc).then(function() {
            async.map(req.core.indexes, function(i, cb) {
                self.mongoDatabaseHandle.createIndex(req.routeParams.resourceName, i, { w: req.config.get('writeConcern')}, function(err, indexName) {
                  if (err instanceof Error) {
                    console.error("Unable to create the index.", err);
                  }
                  cb(err, indexName);
              });
            }, function(e, ret) {
              if (e) {
                throw e;
              }
              fill(ret)
          });

        }).catch(fill);
      }
  })

  return model;
}



