/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , datamodel = require('datamodel')
  , faker = require('faker')
  , assert = require('assert')
  , fs = require('fs')
  ;

module.exports = function(model) {

  model
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
                "template": "http://castorjs.github.io/node-jbj/?input={{baseURL}}/{{_name}}"
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
      var self = this;
      if (self.mongoDatabaseHandle instanceof Error) {
        return fill([]);
      }

      if (self.mongoCollectionsIndexHandle instanceof Error) {
        self.mongoDatabaseHandle.collection(req.config.get('collectionsIndexName'), function(err, newcoll) {
            self.mongoCollectionsIndexHandle = err ? err : newcoll;
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
            newcoll.insertMany([index, self.doc]).then(fill).catch(fill);
        });
      }
      else {
        self.mongoCollectionsIndexHandle.insertOne(self.doc).then(fill).catch(fill);
      }
  })
  .append('directory', function(req, fill) {
      var tabledir = path.join(req.config.get('dataPath'), req.routeParams.resourceName);
      debug('mkdir', tabledir);
      fs.mkdir(tabledir, function(err, res) {
          fill(err ? err : res);
      });
  })

  return model;
}



