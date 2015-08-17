/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:routes:' + basename)
  , express = require('express')
  , fs = require('fs')
  , url = require('url')
  , bodyParser = require('body-parser')
  , crypto = require('crypto')
  , JFUM = require('jfum')
  , Errors = require('../errors.js')
  , Loader = require('castor-load')
 ;

module.exports = function(config) {
  var jfum = new JFUM({
      minFileSize: 1,
      maxFileSize: config.get('maxFileSize'),
      acceptFileTypes: /\.(csv|xml|txt)$/i
  });
  var options = {
    "connexionURI" : config.get('connexionURI'),
    "concurrency" : config.get('concurrency'),
    "delay" : config.get('delay'),
    "maxFileSize" : config.get('maxFileSize'),
    "writeConcern" : config.get('writeConcern'),
    "ignore" : config.get('filesToIgnore'),
    "watch" : false
  };
  var router = express.Router()

  router.route('/-/upload')
  .all(bodyParser.urlencoded({ extended: false }))
  .options(jfum.optionsHandler.bind(jfum))
  .post(jfum.postHandler.bind(jfum), function(req, res, next) {
      // Check if upload failed or was aborted
      if (req.jfum.error) {
        next(req.jfum.error);
      }
      else {
        for (var i = 0; i < req.jfum.files.length; i++) {
          req.jfum.files[i].token = crypto.createHash('sha1').update(req.jfum.files[i].path).digest('hex');
          delete req.jfum.files[i]["path"];
        }
        res.json(req.jfum.files);
      }
  });

  router.route('/-/echo/:basename.:extension')
  .get(function(req, res, next) {
      if (req.query.plain) {
        res.send(req.query.plain);
      }
      else {
        next(new Errors.InvalidParameters('No input.'));
      }
  });

  router.route('/-/load')
  .all(bodyParser.urlencoded({ extended: true}))
  .post(function(req, res, next) {
      var ldr
        , referer = url.parse(req.get('Referer'))
        , resourceName = path.basename(referer.pathname)
        , loader = {}
        , loaders = {
            'xml' : {
              pattern: '**/*.xml',
              options: {},
              module: 'castor-load-xml'
            },
            'csv' : {
              pattern: '**/*.csv',
              options: {},
              module: 'castor-load-csv'
            }
          };

      // TODO : check if req.body is valid
      // TODO : check if resourceName already exists

      if (req.body.loader === undefined || loaders[req.body.loader] === undefined) {
        return next(new Errors.InvalidParameters('Unknown loader.'));
      }
      else {
        loader = loaders[req.body.loader];
      }

      debug('resourceName',  resourceName);
      debug('req.body',  req.body, typeof req.body.file);

      if (req.body.type === 'file' && typeof req.body.file === 'object') {
        var p = require('os').tmpdir(); // upload go to tmpdir
        fs.readdir(p, function (err, files) {
            if (err) {
              throw err;
            }
            files.map(function (file) {
                return path.join(p, file);
            }).filter(function (file) {
                var token = crypto.createHash('sha1').update(file).digest('hex');
                return  (token === req.body.file.token);
            }).forEach(function (file) {
                debug('file', file);
                options['collectionName'] = resourceName;
                var ldr = new Loader(__dirname, options);
                ldr.use(loader.pattern, require(loader.module)(loader.options));
                ldr.push(file);
            });
        });
      }
      else if (req.body.type === 'text') {
        options['collectionName'] = resourceName;
        ldr = new Loader(__dirname, options);
        ldr.use(loader.pattern, require(loader.module)(loader.options));
        ldr.push(url.format({
              protocol: "http",
              hostname: "127.0.0.1",
              port: config.get('port'),
              pathname: "/-/echo/keyboard." + req.body.loader,
              query: {
                plain : req.body.text
              }
        }));
      }
      else if (req.body.type === 'uri') {
        options['collectionName'] = resourceName;
        ldr = new Loader(__dirname, options);
        ldr.use(loader.pattern, require(loader.module)(loader.options));
        ldr.push(req.body.uri);
      }
      else {
        return next(new Errors.InvalidParameters('Unknown type.'));
      }
      res.json({});
  });


  return router;
}
