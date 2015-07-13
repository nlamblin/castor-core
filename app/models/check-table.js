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
  .declare('site', function(req, fill) {
      fill({
          title : req.config.get('title'),
          description : req.config.get('description')
      });
  })
  .declare('page', function(req, fill) {
      fill({
          fakeName : faker.lorem.words().join('-')
      });
  })
  .declare('url', function(req, fill) {
      fill(require('url').parse(req.protocol + '://' + req.get('host') + req.originalUrl));
  })
  .declare('parameters', function(req, fill) {
      fill(req.query);
  })
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
      this.mongoHandle.close().then(fill).catch(fill);
  })
  .append('data', function(req, fill) {
      if (this.mongoHandle instanceof Error) {
        return fill({});
      }
      this.mongoHandle.collection('px_index')
      .findOne(this.mongoQuery)
      .then(fill)
      .catch(fill);
  })
  .attach(module);



