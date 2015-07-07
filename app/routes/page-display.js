
/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:routes:' + basename)
  ;

module.exports = function(config) {

  return require('datamodel')()
  .declare('site', function(req, fill) {
      fill({
          title : config.get('title'),
          description : config.get('description')
      });
  })
  .declare('url', function(req, fill) {
    fill(require('url').parse(req.protocol + '://' + req.get('host') + req.originalUrl));
  })
  .declare('parameters', function(req, fill) {
    fill(req.query);
  })
  .send(function(res, next) {
      res.render(req.params.name + '.' + req.params.format, this);
  })
  .takeout();
};
