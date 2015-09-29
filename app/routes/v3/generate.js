/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , Errors = require('../../helpers/errors.js')
  , bodyParser = require('body-parser')
  , datamodel = require('datamodel')
  , check = require('../../middlewares/check.js')
 ;

module.exports = function(config, router) {

  var page = require('../../models/page.js')
    , generate = require('../../models/gen-documents.js')
    ;
  
  router.route('/-/v3/generate/:resourceName')
  .post(bodyParser.urlencoded({ extended: true}))
  .post(check.body({ 'count': Number}))
  .post(function(req, res, next) {
      if (req.routeParams.resourceName === undefined) {
        return next();
      }
      datamodel([generate])
      .apply(req)
      .then(function(locals) {
          return res.send(204);
      })
      .catch(next);
  });





}
