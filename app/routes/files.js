/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:routes:' + basename)
  , express = require('express')
  , formatik = require('formatik')
  , bodyParser = require('body-parser')
  ;

function transpose(input) {
  var formats = {
    "html" : "text/html",
    "csv" : "text/csv",
    "rss" : "application/rss+xml",
    "atom" : "application/atom+xml",
    "json" : "application/json",
    "xml" : "text/xml",
    "txt" : "text/plain"
  }
  return formats[input] ? formats[input] : input;
}

module.exports = function(config) {


  var func = require('datamodel')()
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
  .append('headers', function(req, fill) {
      var headers = {}, ct = transpose(req.params.format);
      if (ct !== req.params.format) {
        headers['Content-Type'] = ct;
        fill(headers);
      }
      else {
        fill(null);
      }
  })
  .append('template', function(req, fill) {
      if (req.params.name === 'table') {
        return fill(null);
      }
      else {
        fill(req.params.name + '.' + req.params.format);
      }
  })
  .send(function(res, next) {
      if (this.headers === null || this.template === null) {
        return next();
      }
      res.set(this.headers);
      res.render(this.template, this, function(err) {
          if (err) {
            console.error('Nunjucks Error', err);
            next();
          }
      });
  })
  .takeout()

  var router = express.Router()

  router.route('/:name.:format').get(func);

  return router;
}
