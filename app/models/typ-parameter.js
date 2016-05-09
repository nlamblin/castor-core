/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , mqs = require('mongodb-querystring')
  , URL = require('url')
  , fs = require('fs')
  , crypto = require('crypto')
  ;


module.exports = function(model) {
  model
  .declare('query', function(req, fill) {
    fill(mqs.create(req.body));
  })
  .declare('type', function(req, fill) {
    var Errors = req.core.Errors;
    if (req.config.get('allowedTypValues').indexOf(req.query.typ) === -1) {
      return fill(new Errors.InvalidParameters('typ= not allowed.'));
    }
    else if(req.query.typ === undefined) {
      fill('form');
    }
    else {
      fill(req.query.typ);
    }
  })
  .declare('input', function(req, fill) {
    var Errors = req.core.Errors;
    if (req.query.typ === 'file') {
      fill(req.body.file);
    }
    else if (req.query.typ === 'uri') {
      fill(req.body.uri);
    }
    else if (req.query.typ === 'fork') {
      fill(req.body.origin);
    }
    else { // typ === form
      fill(req.body);
    }
  })
  .declare('filename', function(req, fill) {
    if (req.query.filename === undefined) {
      fill(String(Date.now()).concat('.json'));
    }
    else {
      fill(req.query.filename);
    }
  })
 .prepend('stylesheet', function(req, fill) {
   fill(this.query.get('$transform', req.config.get('documentFields')));
 })
 .prepend('loaderFiles', function(req, fill) {
   var self = this;
   if (self.type === 'file' && typeof self.input === 'object') {
     var p = require('os').tmpdir(); // upload go to tmpdir
     fs.readdir(p, function (err, files) {
       if (err) {
         fill(err);
       }
       fill(files.map(function (file) {
         return path.join(p, file);
       }).filter(function (file) {
         var token = crypto.createHash('sha1').update(file).digest('hex');
         return  (token === req.body.file.token);
       }));
     });
   }
   else if (self.type === 'form') {
     fill([URL.format({
       protocol: "http",
       hostname: "127.0.0.1",
       port: req.core.config.get('port'),
       pathname: "/-/echo/" + self.filename,
       query: self.input
     })]);
   }
   else if (self.type === 'uri') {
     fill([self.input]);
   }
   else if (self.type === 'fork' && typeof self.input === 'string') {
     fill([URL.format({
       protocol: "http",
       hostname: "127.0.0.1",
       port: req.core.config.get('port'),
       pathname: "/" + self.input + '/*',
       query: {
         alt: "raw"
       }
     })]);
   }
   else {
     fill([]);
   }

 })
 return model;
}

