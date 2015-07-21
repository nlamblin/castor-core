/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:routes:' + basename)
  , express = require('express')
  , assert = require('assert')
  , Errors = require('../errors.js')
  ;
  

module.exports = function(config) {

  var site = require('../models/site.js');
  var mongo = require('../models/mongo.js');
  var check = require('../models/check-table.js');
  var create = require('../models/create-table.js');
  var dump = require('../models/dump-table.js');
  var router = express.Router();
  var template = 'table.html';
  var authorityName = config.get('authorityName');

  //
  // Route /index
  //
  router.route(authorityName + '/index/')
  .get(function(req, res, next) {
      site().apply(req).then(function(locals) {
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
      mongo(dump()).apply(req, res, next);
  });


  //
  // Route /resourcename
  //
  router.route(authorityName + '/:resourcename/')
  .get(function(req, res, next) {
      debug('check', '/' + req.params.resourcename);
      site(mongo(check())).apply(req)
      .then(function(locals) {
          debug('render', locals);
          return res.render(template, locals);
      })
      .catch(next);
  })
  .post(function(req, res, next) {
      debug('create', '/' + req.params.resourcename);
      create(req)
      .then(function(locals) {
          return res.redirect(authorityName + '/' + req.params.resourcename);
      })
      .catch(next);
  });

  //
  // /resourcename.json
  //
  router.route(authorityName + '/:resourcename.json')
  .get(function(req, res, next) {
      debug('dump', '/' + req.params.resourcename);
      dump(req, res, next);
  });


  return router;
};
