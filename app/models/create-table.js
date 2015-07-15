/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , datamodel = require('datamodel')
  , faker = require('faker')
  , assert = require('assert')
  , MongoClient = require('mongodb').MongoClient
  ;


datamodel()
.declare('mongoQuery', function(req, fill) {
    var q = {
      wid: req.params.resource
    }
    fill(q);
})
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
        "@id": req.params.resource,
        "@context": {
          "url": "http://schema.org/url",
          "title": "http://schema.org/title",
          "description": "http://schema.org/description",
          "name": "http://schema.org/name"
        },
        "url": String(req.config.get('baseURL')).concat("/").concat(req.params.resource),
        "title": faker.lorem.sentence(),
        "description": faker.lorem.paragraph(),
        "reducer": { "get": "title" },
        "name": ""
    });
})
.append('result', function(req, fill) {
    if (this.mongoHandle instanceof Error) {
      return fill([]);
    }
    this.mongoHandle.collection(req.config.get('collectionIndex')).insertOne(this.doc).then(fill).catch(fill);
})
.attach(module);



