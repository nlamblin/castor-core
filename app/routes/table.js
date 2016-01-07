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
  , slashes = require("connect-slashes")
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
      if (value !== undefined) {
        try {
          req.routeParams.operator = core.computer.operator(value);
        }
        catch(e) {
          debug(e);
        }
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
  .get(check.query({'?alt' : ['csv', 'nq', 'json', 'raw'], '?where' : String, '?orderby' : String}))
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

  .all(cors())
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

  .all(cors())
  .get(function(req, res, next) {
      debug('get /:resourceName/:dollar:operator', req.routeParams);
      if (req.routeParams.resourceName === undefined || req.routeParams.dollar === undefined || req.routeParams.operator === undefined) {
        return next();
      }
      datamodel([core.models.mongo, core.models.computeDocuments])
      .apply(req, res, next);
  });




  router.route(prefixURL + '/:resourceName')
  .all(cors())
  .all(slashes())
  .get(function(req, res, next) {
      debug('get /:resourceName', req.routeParams);
      if (req.routeParams.resourceName === undefined) {
        return next();
      }
      datamodel([core.models.page, core.models.mongo, core.models.getTable])
      .apply(req)
      .then(function(locals) {
          return res.render("admin.html", locals);
      })
      .catch(next);
  });

  //
  // Public route
  //
  var prefixKEY = 'ark:';
  router.route(prefixURL + '/' + prefixKEY + '/:documentName')
  .all(cors())
  .get(check.query({'?alt' : ['json', 'raw']}))
  .get(function(req, res, next) {
      debug('FRONT OFFICE');
      debug('get '+ '/' + prefixKEY + '/:documentName', req.routeParams);
      if (req.routeParams.documentName === undefined) {
        return next();
      }
      req.query.alt = req.query.alt === undefined ? 'html' : req.query.alt;
      datamodel([core.models.page, core.models.mongo, core.models.getRootDocument])
      .apply(req, res, next);
  });



  router.route(prefixURL + '/:resourceName/:documentName')
  .all(cors())
  .get(check.query({'?alt' : ['json', 'raw']}))
  .get(function(req, res, next) {
      debug('get /:resourceName', req.routeParams);
      if (req.routeParams.resourceName === undefined || req.routeParams.documentName === undefined) {
        return next();
      }
      req.query.alt = req.query.alt === undefined ? 'html' : req.query.alt;
      datamodel([core.models.page, core.models.mongo, core.models.getTable, core.models.getDocument, core.models.dumpQuery])
      .apply(req, res, next);
  });

  //
  // Public route
  //
  router.route(prefixURL + '/')
  .get(check.query({'?alt' : ['json', 'raw']}))
  .get(function(req, res, next) {
      debug('FRONT OFFICE');
      req.routeParams.resourceName =
      datamodel([core.models.page, core.models.mongo, core.models.getRoot])
      .apply(req, res, next);
  });


    return router;
};
