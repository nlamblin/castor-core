/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , datamodel = require('datamodel')
  , assert = require('assert')
  , Errors = require('../helpers/errors.js')
  ;

module.exports = function(model) {

  model
  .declare('property', function(req, fill) {
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
          "_name": req.routeParams.resourceName,
          "_columns" : [
            //
            // Mandatory Column for the reduce system
            //
            {
              "propertyScheme": "http://schema.org/name",
              "propertyValue" : {
                "set" : "n/a"
              },
              "propertyName" : "name",
              "propertyLabel" : "Name",
              "propertyComment" : "A mandatory column for \"dollar\" URLs"
            },
            //
            // Helper Column for create specific column
            //
           {
              "propertyScheme": "http://castorjs.github.io/node-jbj/",
              "propertyType": "http://www.w3.org/TR/xmlschema-2/#anyURI",
              "propertyValue" : {
                "get": [ "baseURL", "_name" ],
                "join" : "/",
                "prepend" : "http://castorjs.github.io/node-jbj/?input=",
                "append" : "/*?alt=raw"
              },
              "propertyText" : {
                "get" : "_name",
              },
              "propertyName" : "jbj-playground",
              "propertyLabel" : "View it on JBJ Playground",
              "propertyComment" : "A help column to define others columns"
            }
          ],
          //
          // Table metadata
          //
          "title": "Table "+req.routeParams.resourceName,
          "description": "Undefined description."
      });
  })
  .append('mongoResult', function(req, fill) {
      var self = this, query, operation;
      if (self.mongoDatabaseHandle instanceof Error) {
        return fill([]);
      }

      if (self.property && self.property.name === false && self.property.previousName !== 'index') {
        query = {
          _name: self.property.previousName
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
          _name: self.property.name
        };
        operation = { $set:{
            title: self.property.title,
            description: self.property.description
          }
        };
        debug('update table', query, operation);
        self.mongoCollectionsIndexHandle.updateOne(query, operation).then(fill).catch(fill);
      }
      else if (self.property && self.property.name !== self.property.previousName  && self.property.previousName !== 'index') {
        query = {
          _name: self.property.previousName
        };
        operation = {
          $set:{
            _name: self.property.name,
            title: self.property.title,
            description: self.property.description
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
        self.mongoCollectionsIndexHandle.insertOne(self.doc).then(fill).catch(fill);
      }
  })

  return model;
}



