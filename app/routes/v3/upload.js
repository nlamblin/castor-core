/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , express = require('express')
  , fs = require('fs')
  , url = require('url')
  , bodyParser = require('body-parser')
  , crypto = require('crypto')
  , JFUM = require('jfum')
  , Errors = require('../../helpers/errors.js')
 ;

module.exports = function(router, core) {
  var acceptFileTypes = new RegExp('\.('+core.config.get('acceptFileTypes').join('|')+')$', 'i');
  var jfum = new JFUM({
      minFileSize: 1,
      maxFileSize: core.config.get('maxFileSize'),
      acceptFileTypes: acceptFileTypes
  });

  router.route('/-/v3/upload')
  .all(bodyParser.urlencoded({ extended: false }))
  .options(jfum.optionsHandler.bind(jfum))
  .post(jfum.postHandler.bind(jfum), function(req, res, next) {
      if (req.jfum.error) {
        console.error('Upload failed.', req.jfum.error);
        next(req.jfum.error);
      }
      else {
        for (var i = 0; i < req.jfum.files.length; i++) {
          if (req.jfum.files[i].path) {
            req.jfum.files[i].token = crypto.createHash('sha1').update(req.jfum.files[i].path).digest('hex');
            delete req.jfum.files[i]["path"];
          }
          else {
            return next(new Errors.InvalidParameters(req.jfum.files[i].error.toString()));
          }
        }
        res.json(req.jfum.files);
      }
  });

  return router;
}
