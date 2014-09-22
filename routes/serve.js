/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , util = require('util')
  , datamodel = require('datamodel')
  , render = require('../helpers/render.js')
  ;

module.exports = function(config) {

  return datamodel()
  .declare('template', function(req, fill) {
    fill(req.params.name + '.html');
  })
  .declare('site', function(req, fill) {
    fill({
      title : config.get('title'),
      description : config.get('description')
    });
  })
  .declare('page', function(req, fill) {
    fill({
      title : config.get('pages:' + req.params.name + ':title'),
      description : config.get('pages:' + req.params.name + ':description'),
      types : ['text/html', 'application/json']
    });
  })
  .declare('user', function(req, fill) {
    fill(req.user ? req.user : {});
  })
  .declare('config', function(req, fill) {
    fill(config.get());
  })
  .declare('url', function(req, fill) {
    fill(require('url').parse(req.protocol + '://' + req.get('host') + req.originalUrl));
  })
  .declare('query', function(req, fill) {
    fill(req.query);
  })
  .append('headers', function(req, fill) {
    var headers = {};
    headers['Content-Type'] = require('../helpers/format.js')(req.params.format);
    fill(headers);
  })
  .send(function(res, next) {
    render(res, this, next);
  })
  .takeout();
};
