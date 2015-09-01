/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , datamodel = require('datamodel')
  , faker = require('faker')
  , assert = require('assert')
  , Errors = require('../errors.js')
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
  .declare('index', function(req, fill) {
      var index = {
        "_name": "index",
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
              "get": ["baseURL", "_name"],
              "join": "/"
            },
            "propertyText" : {
              "get" : "_name",
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
            },
            //
            // Example Column
            //
            {
              "propertyScheme": "http://schema.org/description",
              "propertyValue" : {
                "set" : faker.lorem.paragraph()
              },
              "propertyName" : "description",
              "propertyLabel" : "Description",
              "propertyComment" : "A example column"
            }
          ],
          //
          // Table metadata
          //
          "title": faker.lorem.sentence(),
          "description": faker.lorem.paragraph()
      });
  })
  .append('mongoResult', function(req, fill) {
      var self = this, query, operation;
      if (self.mongoDatabaseHandle instanceof Error) {
        return fill([]);
      }

      if (self.mongoCollectionsIndexHandle instanceof Error) {
        self.mongoDatabaseHandle.collection(req.config.get('collectionsIndexName'), function(err, newcoll) {
            self.mongoCollectionsIndexHandle = err ? err : newcoll;
            newcoll.insertMany([self.index, self.doc]).then(function() {
                self.mongoDatabaseHandle.createIndex(req.config.get('collectionsIndexName'),
                  {_name:1},
                  {unique:true, background:false, w:1}
                ).then(fill).catch(fill);
            }).catch(fill);
        });
      }
      else if (self.property && self.property.name === false && self.property.previousName !== 'index') {
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



