'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('dotcase:middlewares:' + basename)
  , path = require('path')
  , querystring = require('querystring')
  ;


module.exports = function (mode, options) {

  if (!options) {
    options = {};
  }
  if (!options.page) {
    options.page = '/login';
  }

  if (mode === true) {
    return function (req, res, next) {
      if (req.isAuthenticated()) {
        return next();
      }
      else {
        var u = options.page;
        // u += '/?';
        // u + querystring.stringify({n: options.url || req.originalUrl});
        res.redirect(u)
      }
    }
  }
  else {
    return function (req, res, next) {
      if (req.isAuthenticated()) {
        res.redirect('/403')
      }
      else {
        return next();
      }
    }
  }
}
