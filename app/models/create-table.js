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

  .declare('mongoHandle', function(req, fill) {
      MongoClient.connect(req.config.get('connexionURI')).then(fill).catch(fill);
  })
  .complete('mongoHandle', function(req, fill) {
      if (this.mongoHandle instanceof Error) {
        return fill(this.mongoHandle);
      }
      this.mongoHandle.close().then(fill).catch(fill);
  })
  .prepend('doc', function(req, fill) {
      fill({
          "@id": req.params.resourcename,
          "@context": {
            "url": {
              "@id": "http://schema.org/url",
              "@type": "@id"
            },
            "title": "http://schema.org/title",
            "description": "http://schema.org/description",
            "name": "http://schema.org/name"
          },
          "url": String(req.config.get('baseURL')).concat("/").concat(req.params.resourcename),
          "title": faker.lorem.sentence(),
          "description": faker.lorem.paragraph(),
          "reducer": { "get": "title" },
          "name": ""
      });
  })
  .append('database', function(req, fill) {
      if (this.mongoHandle instanceof Error) {
        return fill([]);
      }
      debug('insert', this.doc);
      this.mongoHandle.collection(req.config.get('collectionIndex')).insertOne(this.doc).then(fill).catch(fill);
  })
  .append('directory', function(req, fill) {
      if (this.mongoHandle instanceof Error) {
        return fill([]);
      }
      var tabledir = path.join(req.config.get('dataPath'), req.params.resourcename);
      debug('mkdir', tabledir);
      fs.mkdir(tabledir, function(err, res) {
          fill(err ? err : res);
      });
  })

  return model;
}



