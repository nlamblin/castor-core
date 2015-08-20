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
          "_fields" : [
            {
              "@id": "http://schema.org/name",
              "stylesheet" : {
                "get" : "title"
              },
              "name" : "localTitle",
              "label" : "localTitle"
            },
            {
              "@id": "http://schema.org/url",
              "@type": "@id",
              "stylesheet" : {
                "get" : "url"
              },
              "name" : "url",
              "label" : "L'URL"
            },
            {
              "@id": "http://schema.org/description",
              "stylesheet" : {
                "get" : "description"
              },
              "name" : "description",
              "label" : "La description"
            }
          ],
          "url": String(req.config.get('baseURL')).concat("/").concat(req.params.resourcename),
          "title": faker.lorem.sentence(),
          "description": faker.lorem.paragraph(),
          "name": req.params.resourcename
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
                  "stylesheet" : {
                    "get" : "title"
                  },
                  "name" : "localTitle",
                  "label" : "localTitle"
                },
                {
                  "@id": "http://schema.org/url",
                  "@type": "@id",
                  "stylesheet" : {
                    "get" : "url"
                  },
                  "name" : "url",
                  "label" : "L'URL"
                },
                {
                  "@id": "http://schema.org/description",
                  "stylesheet" : {
                    "get" : "description"
                  },
                  "name" : "description",
                  "label" : "La description"
                }

                /*,
                 {
                   label: 'Identifier',
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
              "name": "index"
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



