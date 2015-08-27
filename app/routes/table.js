/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:routes:' + basename)
  , express = require('express')
  , assert = require('assert')
  , datamodel = require('datamodel')
  , Errors = require('../errors.js')
  , bodyParser = require('body-parser')
  ;


module.exports = function(config) {

  var site = require('../models/site.js')
    , mongo = require('../models/mongo.js')
    , reduce = require('../models/reduce-table.js')
    , create = require('../models/create-table.js')
    , postcol = require('../models/post-column.js')
    , table = require('../models/get-table.js')
    , dump = require('../models/dump-table.js')
    , router = express.Router()
    , template = 'table.html'
    , authorityName = config.get('authorityName')
    ;

  //
  // Define route parameters
  //
  router.param('resourceName', function(req, res, next, value) {
      req.routeParams.resourceName = value;
      next();
  });

  router.param('star', function(req, res, next, value) {
      if (value === '*') {
        req.routeParams.star = value;
      }
      else {
        req.routeParams.star = undefined;
      }
      next();
  });

  router.param('dollar', function(req, res, next, value) {
      if (value === '$') {
        req.routeParams.dollar = value;
      }
      else {
        req.routeParams.dollar = undefined;
      }
      next();
  });

  router.param('columnName', function(req, res, next, value) {
      req.routeParams.columnName = value;
      next();
  });


  //
  // documents (L)isted
  //
  router.route(authorityName + '/:resourceName/:star')

  .get(function(req, res, next) {
      debug('get /:resourceName/:star', req.routeParams);
      if (req.routeParams.resourceName === undefined || req.routeParams.star === undefined) {
        return next();
      }
      datamodel([mongo, table, dump])
      .apply(req, res, next);
  });

  //
  // documents list title
  //
  router.route(authorityName + '/:resourceName/:dollar')

  .get(function(req, res, next) {
      debug('get /:resourceName/:dollar', req.routeParams);
      if (req.routeParams.resourceName === undefined || req.routeParams.dollar === undefined) {
        return next();
      }
      datamodel([mongo, reduce])
      .apply(req, res, next);
  });



  //
  // Route /resourcename
  //
  router.route(authorityName + '/:resourceName')

  .get(function(req, res, next) {
      debug('get /:resourceName', req.routeParams);
      if (req.routeParams.resourceName === undefined) {
        return next();
      }
      datamodel([mongo, site, table])
      .apply(req)
      .then(function(locals) {
          debug('render', template);
          return res.render(template, locals);
      })
      .catch(next);
  })
  .post(function(req, res, next) {
      debug('post /:resourceName', req.routeParams);
      if (req.routeParams.resourceName === undefined) {
        return next();
      }
      datamodel([mongo, create])
      .apply(req)
      .then(function(locals) {
          debug('redirect', authorityName + '/' + req.routeParams.resourceName);
          return res.redirect(authorityName + '/' + req.routeParams.resourceName);
      })
      .catch(next);
  });


  router.route(authorityName + '/:resourceName/:star/:columnName')

  .get(function(req, res, next) {
      debug('get /:resourceName/:star/:columnName', req.routeParams);
      if (req.routeParams.resourceName === undefined || req.routeParams.star === undefined || req.routeParams.columnName === undefined) {
        return next();
      }
      res.send(req.routeParams.resourceName + '>' +req.routeParams.star + '>'+req.routeParams.columnName);
  })
  .all(bodyParser.urlencoded({ extended: true}))
 .post(function(req, res, next) {
      debug('post /:resourceName/:star/:columnName', req.routeParams);
      if (req.routeParams.resourceName === undefined || req.routeParams.star === undefined || req.routeParams.columnName === undefined) {
        return next();
      }
      datamodel([mongo, postcol])
      .apply(req)
      .then(function(locals) {
          debug('redirect', authorityName + '/' + req.routeParams.resourceName);
          return res.redirect(authorityName + '/' + req.routeParams.resourceName);
      })
      .catch(next);
  });



  return router;
};
