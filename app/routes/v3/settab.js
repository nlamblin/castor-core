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
    , mongo = require('../../models/mongo.js')
    , posttab = require('../../models/post-table.js')
    ;


  router.route('/-/v3/settab/:resourceName')
  .post(bodyParser.urlencoded({ extended: true}))
  .post(check.body({ '?name': /\w+/, '?title': String, '?description': String}))
  .post(function(req, res, next) {
      if (req.routeParams.resourceName === undefined) {
        return next();
      }
      datamodel([mongo, posttab])
      .apply(req)
      .then(function(locals) {
          return res.send(204);
      })
      .catch(next);
  });





}
