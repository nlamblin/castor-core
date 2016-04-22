/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , mqs = require('mongodb-querystring')
  ;


module.exports = function(model) {
  model
  .declare('query', function(req, fill) {
    fill(mqs.create(req.body));
  })
  .declare('type', function(req, fill) {
    var Errors = req.core.Errors;
    if (req.query.typ === undefined || req.config.get('allowedTypValues').indexOf(req.query.typ) === -1) {
      return fill(new Errors.InvalidParameters('typ= not allowed.'));
    }
    else {
      fill(req.query.typ);
    }
  })
  .declare('input', function(req, fill) {
    var Errors = req.core.Errors;
    if (req.query.typ === undefined || req.config.get('allowedTypValues').indexOf(req.query.typ) === -1) {
      return fill(new Errors.InvalidParameters('typ= not allowed.'));
    }
    else if (req.body && typeof req.body === 'object') {
      fill(req.body[req.query.typ]);
    }
    else {
      fill({});
    }
  })
  .declare('extension', function(req, fill) {
    if (req.body.extension === undefined || req.config.get('acceptFileTypes').indexOf(req.body.extension) === -1) {
      req.body.extension = 'json';
    }
    else {
      fill(req.body.extension);
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
         throw err;
       }
       fill(files.map(function (file) {
         return path.join(p, file);
       }).filter(function (file) {
         var token = crypto.createHash('sha1').update(file).digest('hex');
         return  (token === req.body.file.token);
       }));
     });
   }
   else if (self.type === 'keyboard') {
     fill([url.format({
       protocol: "http",
       hostname: "127.0.0.1",
       port: core.config.get('port'),
       pathname: "/-/v3/echo/keyboard." + self.extension,
       query: {
         plain : self.input
       }
     })]);
   }
   else if (self.type === 'uri') {
     fill([input]);
   }
   else if (self.type === 'fork' && typeof self.input === 'string') {
     fill([url.format({
       protocol: "http",
       hostname: "127.0.0.1",
       port: core.config.get('port'),
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

