/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , datamodel = require('datamodel')
  , cors = require('cors')
  ;


module.exports = function(router, core) {

  var prefixURL = core.config.get('prefixURL');
  var prefixKEY = core.config.get('prefixKEY');

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
        next();
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

  router.param('fieldName', function(req, res, next, value) {
    if (value !== '*' && value !== '$') {
      req.routeParams.fieldName = value;
    }
    else {
      req.routeParams.fieldName = undefined;
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


  //
  // table "root" & his rows
  //
  router.route(prefixURL + '/')
  .get(function(req, res, next) {
    if (req.query.alt === undefined) {
      req.query.alt = 'html';
    }
    datamodel([core.models.page, core.models.alt, core.models.mongo, core.models.getRoot])
    .apply(req, res, next);
  });


  //
  // row of table "root"
  //
  router.route(prefixURL + '/' + prefixKEY + '/:documentName')
  .all(cors())
  .get(function(req, res, next) {
    debug('get '+ '/' + prefixKEY + '/:documentName', req.routeParams);
    if (req.routeParams.documentName === undefined) {
      return next();
    }
    req.query.alt = req.query.alt === undefined ? 'html' : req.query.alt;
    datamodel([core.models.page, core.models.alt, core.models.mongo, core.models.getRootDocument])
    .apply(req, res, next);
  });




  //
  // REST API : rows of table
  //
  router.route(prefixURL + '/:resourceName/:star')
  .all(cors())
  .get(function(req, res, next) {
    if (req.routeParams.resourceName === undefined || req.routeParams.star === undefined) {
      return next();
    }
    debug('get /:resourceName/:star', req.routeParams);
    datamodel([core.models.mongo, core.models.alt, core.models.getTable, core.models.getDocuments, core.models.dumpQuery])
    .apply(req, res, next);
  });


  //
  // REST API : fields of row
  //
  router.route(prefixURL + '/:resourceName/:documentName/:star')
  .all(cors())
  .get(function(req, res, next) {
    if (req.routeParams.resourceName === undefined || req.routeParams.documentName === undefined || req.routeParams.star === undefined) {
      return next();
    }
    debug('get /:resourceName/:documentName/:star', req.routeParams);
    datamodel([core.models.mongo, core.models.alt, core.models.getTable, core.models.getDocument, core.models.dumpQuery])
    .apply(req, res, next);
  });

  //
  // REST API : Values of field
  //
  router.route(prefixURL + '/:resourceName/:documentName/:dollar:fieldName')
  .all(cors())
  .get(function(req, res, next) {
    if (req.routeParams.resourceName === undefined || req.routeParams.documentName === undefined || req.routeParams.dollar === undefined || req.routeParams.fieldName === undefined) {
      return next();
    }
    debug('get /:resourceName/:documentName/:dollar:fieldName', req.routeParams);
    datamodel([core.models.mongo, core.models.alt, core.models.getTable, core.models.getDocument, core.models.dumpQuery])
    .apply(req, res, next);
  });


  //
  // REST API : default computation of table
  //
  router.route(prefixURL + '/:resourceName/:dollar')

  .all(cors())
  .get(function(req, res, next) {
    if (req.routeParams.resourceName === undefined || req.routeParams.dollar === undefined) {
      return next();
    }
    debug('get /:resourceName/:dollar', req.routeParams);
    req.query.$query = {
      _wid : req.routeParams.resourceName
    }
    req.query.field = '_label';
    req.routeParams.resourceName = 'index';
    req.routeParams.operato = core.computer.operator('labelize');
    datamodel([core.models.mongo, core.models.computeDocuments])
    .apply(req, res, next);
  });


  //
  // REST API : computation of table
  //
  router.route(prefixURL + '/:resourceName/:dollar:operator')

  .all(cors())
  .get(function(req, res, next) {
    if (req.routeParams.resourceName === undefined || req.routeParams.dollar === undefined || req.routeParams.operator === undefined) {
      return next();
    }
    debug('get /:resourceName/:dollar:operator', req.routeParams);
    datamodel([core.models.mongo, core.models.computeDocuments])
    .apply(req, res, next);
  });



  return router;
};
