'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('dotcase:middlewares:' + basename)
  , schema = require('js-schema')
  , Errors = require('../helpers/errors.js')
  , util = require('util')
  ;


function toError(prefix, errors) {

  var field = '', message = '';

  if (typeof errors === 'object') {
    field = Object.keys(errors).shift()
    if (typeof errors[field] === 'object') {
      console.error('check ' + prefix + ' failed', errors[field]);
    }
    else {
      message = ' : ' + errors[field];
    }
    field = '.' + field;
  }
  else {
    message = errors;
  }

  return new Errors.InvalidParameters('Errors in `' + prefix + field + '` ' + message);
}

module.exports.query = function (s) {
  var mask = schema(s)
  return function (req, res, next) {
    if (req.query && mask(req.query) === true) {
      next();
    }
    else {
      next(toError('query', mask.errors(req.query)));
    }
  }
}

module.exports.body = function (s) {
  var mask = schema(s)
  return function (req, res, next) {

    if (req.body && mask(req.body) === true) {
      next();
    }
    else {
      next(toError('body', mask.errors(req.body)));
    }
  }
}
