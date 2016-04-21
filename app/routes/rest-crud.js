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

  router.param('documentName', function(req, res, next, value) {
    if (value !== '*' && value !== '$') {
      req.routeParams.documentName = value;
    }
    else {
      req.routeParams.documentName = undefined;
    }
    next();
  });


  //
  // REST API : CRUD table
  //
  router.route(prefixURL + '/:resourceName')
  .all(cors())
  .post(function(req, res, next) {
    if (req.routeParams.resourceName === undefined) {
      return next();
    }
    debug('post /:resourceName', req.routeParams);
    datamodel([core.models.mongo, core.models.typ, core.models.loadTable])
    .apply(req, res, next);
  });


  //
  // REST API : CRUD document
  //
  // router.route(prefixURL + '/:resourceName/:documentName')
  // .all(cors())
  // .get(function(req, res, next) {
  // if (req.routeParams.resourceName === undefined || req.routeParams.documentName === undefined) {
  // return next();
  // }
  // debug('get /:resourceName/:documentName', req.routeParams);
  // datamodel([core.models.mongo, core.models.crudDocument])
  // .apply(req, res, next);
  // });


  return router;
};
