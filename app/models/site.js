/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , datamodel = require('datamodel')
  ;


module.exports = function(model) {
  if (model === undefined) {
    model = datamodel();
  }
  model.declare('site', function(req, fill) {
      fill({
          title : req.config.get('title'),
          description : req.config.get('description')
      });
  })
  .declare('url', function(req, fill) {
      fill(require('url').parse(req.protocol + '://' + req.get('host') + req.originalUrl));
  })
  return model;
}