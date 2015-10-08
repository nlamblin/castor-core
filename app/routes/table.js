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


module.exports = function(router, core) {

  var prefixURL = core.config.get('prefixURL');

  //
  // Define route parameters
  //
  router.param('resourceName', function(req, res, next, value) {
      req.routeParams.resourceName = value;
      next();
  });


  router.param('operator', function(req, res, next, value) {
      try {
        req.routeParams.operator = core.computer.operator(value);
      }
      catch(e) {
        debug(e);
      }
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
      datamodel([core.models.mongo, core.models.getTable, core.models.getDocuments, core.models.dumpQuery])
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
      datamodel([core.models.mongo, core.models.getTable, core.models.getDocument, core.models.dumpQuery])
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
      datamodel([core.models.mongo, core.models.reduceTable])
      .apply(req, res, next);
  });


  //
  // documents list title
  //
  router.route(prefixURL + '/:resourceName/:dollar:operator')

  .get(function(req, res, next) {
      debug('get /:resourceName/:dollar:operator', req.routeParams);
      if (req.routeParams.resourceName === undefined || req.routeParams.dollar === undefined || req.routeParams.operator === undefined) {
        return next();
      }
      datamodel([core.models.mongo, core.models.computeDocuments])
      .apply(req, res, next);
  });




  router.route(prefixURL + '/:resourceName')
  .get(function(req, res, next) {
      debug('get /:resourceName', req.routeParams);
      if (req.routeParams.resourceName === undefined) {
        return next();
      }
      datamodel([core.models.page, core.models.mongo, core.models.getTable])
      .apply(req)
      .then(function(locals) {
          return res.render("index.html", locals);
      })
      .catch(next);
  });



  return router;
};
