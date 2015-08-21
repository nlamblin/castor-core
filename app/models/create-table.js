/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , datamodel = require('datamodel')
  , faker = require('faker')
  , assert = require('assert')
  , MongoClient = require('mongodb').MongoClient
  , fs = require('fs')
  ;

module.exports = function(model) {

  model
  .declare('doc', function(req, fill) {
      fill({
          "_name": req.params.resourcename,
          "_fields" : [
            {
              "@id": "http://schema.org/name",
              "propertyValue" : {
                "get" : "title"
              },
              "propertyName" : "localTitle",
              "propertyLabel" : "localTitle"
            },
            {
              "@id": "http://schema.org/url",
              "@type": "@id",
              "propertyValue" : {
                "get" : "url"
              },
              "propertyName" : "url",
              "propertyLabel" : "L'URL"
            },
            {
              "@id": "http://schema.org/description",
              "propertyValue" : {
                "get" : "description"
              },
              "propertyName" : "description",
              "propertyLabel" : "La description"
            }
          ],
          "url": String(req.config.get('baseURL')).concat("/").concat(req.params.resourcename),
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
              "_fields" : [
                {
                  "@id": "http://schema.org/name",
                  "propertyValue" : {
                    "get" : "title"
                  },
                  "propertyName" : "localTitle",
                  "propertyLabel" : "localTitle"
                },
                {
                  "@id": "http://schema.org/url",
                  "@type": "@id",
                  "propertyValue" : {
                    "get" : "url"
                  },
                  "propertyName" : "url",
                  "propertyLabel" : "L'URL"
                },
                {
                  "@id": "http://schema.org/description",
                  "propertyValue" : {
                    "get" : "description"
                  },
                  "propertyName" : "description",
                  "propertyLabel" : "La description"
                }

                /*,
                 {
                   propertyLabel: 'Identifier',
                   scheme : 'http://purl.org/dc/elements/1.1/identifier',
                   name : 'identifier',
                   value : {
                     "get" : "@id"
                   }
                 }
                 */
              ],
              "url": String(req.config.get('baseURL')).concat("/").concat("index"),
              "title": req.config.get('title'),
              "description": req.config.get('description'),
              "_name": "index"
            };
            newcoll.insertMany([index, self.doc]).then(fill).catch(fill);
        });
      }
      else {
        self.mongoCollectionsIndexHandle.insertOne(self.doc).then(fill).catch(fill);
      }
  })
  .append('directory', function(req, fill) {
      var tabledir = path.join(req.config.get('dataPath'), req.params.resourcename);
      debug('mkdir', tabledir);
      fs.mkdir(tabledir, function(err, res) {
          fill(err ? err : res);
      });
  })

  return model;
}



