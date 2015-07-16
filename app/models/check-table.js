/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , datamodel = require('datamodel')
  , faker = require('faker')
  , assert = require('assert')
  , MongoClient = require('mongodb').MongoClient
  , Errors = require('../errors.js')
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
          "@id": req.params.resource
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
  .append('table', function(req, fill) {
      if (this.mongoHandle instanceof Error) {
        return fill([]);
      }
      this.mongoHandle.collection(req.config.get('collectionIndex'))
      .findOne(this.mongoQuery)
      .then(function(doc) {
          if (!doc) {
            fill(new Errors.TableNotFound('The table does not exist.'));
          }
          else {
            fill(doc);
          }
      })
      .catch(fill);
  })
  .attach(module);



