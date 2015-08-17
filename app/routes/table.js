/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:routes:' + basename)
  , express = require('express')
  , assert = require('assert')
  , datamodel = require('datamodel')
  , Errors = require('../errors.js')
  ;


module.exports = function(config) {

  var site = require('../models/site.js')
    , mongo = require('../models/mongo.js')
    , check = require('../models/check-table.js')
    , check = require('../models/check-table.js')
    , create = require('../models/create-table.js')
    , cols = require('../models/cols-table.js')
    , dump = require('../models/dump-table.js')
    , router = express.Router()
    , template = 'table.html'
    , authorityName = config.get('authorityName')
    ;

  //
  // Route /index
  //
  router.route(authorityName + '/index/')
  .get(function(req, res, next) {
      datamodel([site, cols])
      .apply(req)
      .then(function(locals) {
          return res.render(template, locals);
      })
      .catch(next);
  })
  .post(function(req, res, next) {
      next(new Errors.IndexNotFound('Database looks empty.'));
  });


  //
  // Route /index.json
  //
  router.route(authorityName + '/index.json')
  .get(function(req, res, next) {
      req.params.resourcename = 'index';
      debug('dump', '/' + req.params.resourcename);
      datamodel([mongo, dump])
      .apply(req, res, next);
  });

  //
  // /resourcename.json
  //
  router.route(authorityName + '/:resourcename.json')
  .get(function(req, res, next) {
      debug('dump', '/' + req.params.resourcename);
      datamodel([mongo, dump])
      .apply(req, res, next);
  });


  //
  // Route /resourcename
  //
  router.route(authorityName + '/:resourcename/')
  .get(function(req, res, next) {
      debug('check', '/' + req.params.resourcename);
      datamodel([check, mongo, site])
      .apply(req)
      .then(function(locals) {
          debug('render', locals);
          return res.render(template, locals);
      })
      .catch(next);
  })
  .post(function(req, res, next) {
      debug('create', '/' + req.params.resourcename);
      datamodel([create])
      .apply(req)
      .then(function(locals) {
          return res.redirect(authorityName + '/' + req.params.resourcename);
      })
      .catch(next);
  });


  return router;
};
