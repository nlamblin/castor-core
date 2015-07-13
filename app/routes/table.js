/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:routes:' + basename)
  , util = require('util')
  , datamodel = require('datamodel')
  , express = require('express')
  ;

module.exports = function(config) {

  var check = require('../models/check-table.js')
  var router = express.Router()

  if (config.has('authorityName')) {
    router.route('/' + config.get('authorityName') + '/:resource').get(function(req, res, next) {
        check(req, function(err, locals) {
            if (err) {
              next(err);
            }
            else {
              res.render('table.html', locals);
            }
        });
    });
  }
  else {
    router.route('/:resource').get(function(req, res, next) {
        check(req, function(err, locals) {
            if (err) {
              next(err);
            }
            else {
              res.render('table.html', locals);
            }
        });
    });
  }



  return router;
};
