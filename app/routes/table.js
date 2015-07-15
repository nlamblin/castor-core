/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:routes:' + basename)
  , express = require('express')
  , assert = require('assert')
  , faker = require('faker')
  , MongoClient = require('mongodb').MongoClient
  ;

module.exports = function(config) {

  var check = require('../models/check-table.js');
  var router = express.Router();
  var template = 'table.html';

  if (config.has('authorityName')) {
    router.route('/' + config.get('authorityName') + '/:resource').get(function(req, res, next) {
        check(req, function(err, locals) {
            if (err) {
              next(err);
            }
            else {
              res.render(template, locals);
            }
        });
    });
  }
  else {
    router.route('/:resource')
    .get(function(req, res, next) {
        debug('check', req.params.resource);
        check(req, function(err, locals) {
            debug('err', err);
            if (err) {
              next(err);
            }
            else {
              res.render(template, locals);
            }
        });
    })
    .post(function(req, res, next) {
        MongoClient.connect(req.config.get('connexionURI')).then(function(db) {

            var coll = db.collection(req.config.get('collectionIndex'));
            var doc = {
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
            };
            coll.insertOne(doc).then(function() {
                res.redirect('.');
            })
            .catch(next);

        }).catch(next);
    });
  }

  return router;
};
