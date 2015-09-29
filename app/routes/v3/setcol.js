/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , Errors = require('../../helpers/errors.js')
  , bodyParser = require('body-parser')
  , datamodel = require('datamodel')
 ;

module.exports = function(config, router) {

  var page = require('../models/page.js')
    , mongo = require('../models/mongo.js')
    , postcol = require('../models/post-column.js')
    ;



  //   router.route(authorityName + '/:resourceName/:star/:columnName')
  router.route('/-/v3/setcol/:columnName')
  .post(bodyParser.urlencoded({ extended: true}))
  .post(function(req, res, next) {
      debug('post /:resourceName/:star/:columnName', req.routeParams);
      if (req.routeParams.resourceName === undefined || req.routeParams.star === undefined || req.routeParams.columnName === undefined) {
        return next();
      }
      datamodel([mongo, postcol])
      .apply(req)
      .then(function(locals) {
          return res.send(204);
      })
      .catch(next);
  });




}
