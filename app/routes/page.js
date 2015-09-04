/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:routes:' + basename)
  , datamodel = require('datamodel')
  , express =  require('express')
  ;

module.exports = function(config) {

  var supportedFormats = {
    "html" : "text/html",
    "txt" : "text/plain",
    "rss" : "application/rss+xml",
    "atom" : "application/atom+xml",
    "json" : "application/json",
    "xml" : "text/xml"
  }

  var router = express.Router();

  //
  // Define route parameters
  //
  router.param('name', function(req, res, next, value) {
      req.templateName = value;
      next();
  });
  router.param('format', function(req, res, next, value) {
      if (supportedFormats[value]) {
        req.templateName = req.templateName + '.' + value;
        req.templateMimetype = supportedFormats[value];
      }
      next();
  });


  //
  // Define routes
  //

  router.route('/:name.:format')
  .get(function(req, res, next) {
      if (req.templateMimetype === undefined) {
        return next();
      }

      datamodel()
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
              types : ['text/html', 'text/plain']
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
      .declare('parameters', function(req, fill) {
          fill(req.query);
      })
      .apply(req)
      .then(function(locals) {
          res.set('Content-Type', req.templateMimetype);
          res.render(req.templateName, locals);
          return;
      })
      .catch(next);
  })
  return router;
};
