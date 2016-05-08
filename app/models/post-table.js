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
      var Errors = req.core.Errors;
      debug('req.body', req.body);
      var property = {
        name: req.routeParams.resourceName
      };
      if (req.body && req.body.name && req.body.name === 'index') {
        property.previousName = req.routeParams.resourceName;
        property.name = req.routeParams.resourceName;
        property.title = req.body.title || null;
        property.description = req.body.description || null;
        property.template = req.body.template || null;
        property.ref = req.body.ref || null;
      }
      else if (req.body && req.body.name && req.body.name !== 'index') {
        property.previousName = req.routeParams.resourceName;
        property.name = req.body.name || '';
        property.title = req.body.title || null;
        property.description= req.body.description || null;
        property.template = req.body.template || null;
        property.ref = req.body.ref || null;
      }
      else if (req.body && req.body[req.routeParams.resourceName] == 'true' &&  req.routeParams.resourceName !== 'index') {
        property.name = false;
        property.previousName = req.routeParams.resourceName;
      }
      else if (req.body.origin) {
        property.originalName = req.body.origin;
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
           "_template": "<ul><li>_wid : {{_wid}}</li><li>_url : {{_url}}</li><li>_description : {{_description}}</li><li>_url : <a href=\"{{_url|e}}\">{{$_url}}</a></li><li>_label : {{_label}}</li><li>_text : {{_text}}</li><li>_hash : {{_hash}}</li></ul>",
          "_columns" : {
            "_wid" : {
              //
              // Mandatory Column for the reduce system
              //
              "label" : "Identifier",
              "scheme": "http://purl.org/dc/elements/1.1/identifier",
            },
            "_url" : {
              "label" : "Representative label",
              "scheme": "http://schema.org/url",
              "type": "http://www.w3.org/TR/xmlschema-2/#string",
              "get": ["baseURL", "_table._wid", "_wid"],
              "join": "/",
              "title": {
                "get" : "_label",
                "join" : "/"
              }
            },
            "_description" : {
              "label" : "Representative text",
              "scheme": "https://schema.org/description",
              "type": "http://www.w3.org/TR/xmlschema-2/#anyURI",
              "get": "_title",
              "truncate": 8,
              "append": "..."
            }
          }
      });
  })
  .prepend('action', function(req, fill) {
      var self = this;
      if (self.property && self.property.name === false && self.property.previousName !== 'index') {
        fill("delete")
      }
      else if (self.property && self.property.name === self.property.previousName) {
        fill("update")
      }
      else if (self.property && self.property.originalName === undefined && self.property.name !== self.property.previousName  && self.property.previousName !== 'index') {
        fill("rename")
      }
      else if (self.property && self.property.originalName) {
        fill("clone")
      }
      else {
        fill("add")
      }
  })
  .append('mongoResult', function(req, fill) {
      var self = this, query, operation;
      if (self.mongoDatabaseHandle instanceof Error) {
        return fill([]);
      }

      if (self.action === "delete") {
        query = {
          _wid: self.property.previousName
        }
        self.mongoDatabaseHandle.collectionsIndex().deleteOne(query).then(function(r) {
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
      else if (self.action === "update") {
        query = {
          _wid: self.property.name
        };
        operation = {
          $set : {
          }
        };
        if (self.property.title !== null) {
          operation['$set']._label = self.property.title;
        }
        if (self.property.description !== null) {
          operation['$set']._text = self.property.description;
        }
        if (self.property.template !== null) {
          operation['$set']._template = self.property.template;
        }
        if (self.property.ref !== null) {
          operation['$set']._ref = self.property.ref;
        }

        debug('update table', query, operation);
        self.mongoDatabaseHandle.collectionsIndex().updateOne(query, operation).then(fill).catch(fill);
      }
      else if (self.action === "rename") {
        query = {
          _wid: self.property.previousName
        };
        operation = {
          $set:{
            _wid: self.property.name,
          }
        }
        if (self.property.title !== null) {
          operation['$set']._label = self.property.title;
        }
        if (self.property.description !== null) {
          operation['$set']._text = self.property.description;
        }
        if (self.property.template !== null) {
          operation['$set']._template = self.property.template;
        }
        if (self.property.ref !== null) {
          operation['$set']._ref = self.property.ref;
        }
        debug('rename table', query, operation);
        self.mongoDatabaseHandle.collectionsIndex().updateOne(query, operation).then(function(r) {
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
      else if (self.action === "clone") {
        query = {
          _wid: self.property.originalName
        };
        debug('clone table', query);
        self.mongoDatabaseHandle.collectionsIndex().findOne(query).then(function(newdoc) {
            delete newdoc._id;
            newdoc._from  = self.property.originalName;
            newdoc._wid = req.routeParams.resourceName;
            newdoc._root = false
            newdoc.fid  = req.routeParams.resourceName;
            newdoc.number = 0;
            newdoc.state = "inserted";
            debug('newdoc', newdoc);
            self.mongoDatabaseHandle.collectionsIndex().insertOne(newdoc).then(function() {
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
        }).catch(fill);
      }
      else {
        debug('add table', query, operation);
        self.mongoDatabaseHandle.collectionsIndex().insertOne(self.doc).then(function() {
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



