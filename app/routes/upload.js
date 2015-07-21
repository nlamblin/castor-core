/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:routes:' + basename)
  , express = require('express')
  , formatik = require('formatik')
  , bodyParser = require('body-parser')
  , crypto = require('crypto')
  , JFUM = require('jfum')
  ;

module.exports = function(config) {
  var jfum = new JFUM({
      minFileSize: 1,
      maxFileSize: config.get('maxFileSize'),
      acceptFileTypes: /\.(csv|xml|txt)$/i
  });

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
          req.jfum.files[i].token = crypto.createHash('sha1').update(req.jfum.files[i].path);
          delete req.jfum.files[i]["path"];
        }
        res.json(req.jfum.files);
      }
  });

  return router;
}
