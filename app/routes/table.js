/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:routes:' + basename)
  , express = require('express')
  , assert = require('assert')
  , Errors = require('../errors.js')
  ;

module.exports = function(config) {

  var check = require('../models/check-table.js');
  var create = require('../models/create-table.js');
  var router = express.Router();
  var template = 'table.html';

  if (config.has('authorityName')) {
    router.route('/' + config.get('authorityName') + '/:resource').get(function(req, res, next) {
        check(req, function(err, locals) {
            if (err) {
              next(err);
            }
            else {
              res.render(template, locals);
            }
        });
    });
  }
  else {
    router.route('/:resource')
    .get(function(req, res, next) {
        check(req, function(err, locals) {
            if (err instanceof Errors.TableNotFound && req.params.resource === "index") {
              next(new Errors.IndexNotFound('Database looks empty.'));
            }
            else if (err) {
              next(err);
            }
            else {
              res.render(template, locals);
            }
        });
    })
    .post(function(req, res, next) {
        if (req.params.resource === "index") {
          next(new Errors.IndexNotFound('Database looks empty.'));
        }
        else {
          create(req, function(err, locals) {
              if (err) {
                next(err);
              }
              else {
                res.redirect('.');
              }
          });
        }
    });
  }

  return router;
};
