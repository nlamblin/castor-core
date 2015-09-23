/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , datamodel = require('datamodel')
  ;


module.exports = function(model) {
  if (model === undefined) {
    model = datamodel();
  }
  model
  .declare('site', function(req, fill) {
      fill({
          title : req.config.get('title'),
          description : req.config.get('description')
      });
  })
  .declare('page', function(req, fill) {
      fill({
          title : req.config.get('pages:' + req.params.name + ':title'),
          description : req.config.get('pages:' + req.params.name + ':description'),
          types : ['text/html', 'text/plain']
      });
  })
  .declare('user', function(req, fill) {
      fill(req.user ? req.user : {});
  })
  .declare('config', function(req, fill) {
      fill(req.config.get());
  })
  .declare('url', function(req, fill) {
      fill(require('url').parse(req.protocol + '://' + req.get('host') + req.originalUrl));
  })
  .declare('parameters', function(req, fill) {
      fill(req.query);
  })

  return model;
}
