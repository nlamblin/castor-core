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

  var check = require('../models/check-table.js');
  var create = require('../models/create-table.js');
  var dump = require('../models/dump-table.js');
  var router = express.Router();
  var template = 'table.html';
  var authorityName = config.get('authorityName');



  router.route(authorityName + '/index')
  .get(function(req, res, next) {
      debug('check', '/index');
      req.params.resource = 'index';
      check(req)
      .then(function(locals) {
          return res.render(template, locals);
      })
      .catch(next);
  })
  .post(function(req, res, next) {
      next(new Errors.IndexNotFound('Database looks empty.'));
  });


  router.route(authorityName + '/:resource')
  .get(function(req, res, next) {
      debug('check', '/' + req.params.resource);
      check(req)
      .then(function(locals) {
          debug('render', locals);
          return res.render(template, locals);
      })
      .catch(next);
  })
  .post(function(req, res, next) {
      debug('create', '/' + req.params.resource);
      create(req)
      .then(function(locals) {
          return res.redirect(authorityName + '/' + req.params.resource);
      })
      .catch(next);
  });


  router.route(authorityName + '/:resource.json')
  .get(function(req, res, next) {
      debug('dump', '/' + req.params.resource);
      dump(req, res, next);
  })


  return router;
};
