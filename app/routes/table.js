/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , express = require('express')
  , assert = require('assert')
  , datamodel = require('datamodel')
  , Errors = require('../helpers/errors.js')
  , bodyParser = require('body-parser')
  , cors = require('cors')
  , check = require('../middlewares/check.js')
  ;


module.exports = function(router, config) {

  var page = require('../models/page.js')
    , mongo = require('../models/mongo.js')
    , reduce = require('../models/reduce-table.js')
    , table = require('../models/get-table.js')
    , docu = require('../models/get-document.js')
    , docus = require('../models/get-documents.js')
    , dump = require('../models/dump-query.js')
    , prefixURL = config.get('prefixURL')
    ;

  //
  // Define route parameters
  //
  router.param('resourceName', function(req, res, next, value) {
      req.routeParams.resourceName = value;
      next();
  });

  router.param('documentName', function(req, res, next, value) {
      if (value !== '*' && value !== '$') {
        req.routeParams.documentName = value;
      }
      else {
        req.routeParams.documentName = undefined;
      }
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
  router.route(prefixURL + '/:resourceName/:star')

  .all(cors())
  .get(check.query({'?alt' : ['csv', 'nq', 'json']}))
  .get(function(req, res, next) {
      debug('get /:resourceName/:star', req.routeParams);
      if (req.routeParams.resourceName === undefined || req.routeParams.star === undefined) {
        return next();
      }
      datamodel([mongo, table, docus, dump])
      .apply(req, res, next);
  });

  router.route(prefixURL + '/:resourceName/:documentName/:star')

  .all(cors())
  .get(check.query({'?alt' : ['cvs', 'nq', 'json', 'raw']}))
  .get(function(req, res, next) {
      debug('get /:resourceName/:documentName/:star', req.routeParams);
      if (req.routeParams.resourceName === undefined || req.routeParams.documentName === undefined || req.routeParams.star === undefined) {
        return next();
      }
      datamodel([mongo, table, docu, dump])
      .apply(req, res, next);
  });


  //
  // documents list title
  //
  router.route(prefixURL + '/:resourceName/:dollar')

  .get(function(req, res, next) {
      debug('get /:resourceName/:dollar', req.routeParams);
      if (req.routeParams.resourceName === undefined || req.routeParams.dollar === undefined) {
        return next();
      }
      datamodel([mongo, reduce])
      .apply(req, res, next);
  });



  router.route(prefixURL + '/:resourceName')
  .get(function(req, res, next) {
      debug('get /:resourceName', req.routeParams);
      if (req.routeParams.resourceName === undefined) {
        return next();
      }
      datamodel([page, mongo, table])
      .apply(req)
      .then(function(locals) {
          return res.render("index.html", locals);
      })
      .catch(next);
  });



  return router;
};
