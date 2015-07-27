/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:routes:' + basename)
  , express = require('express')
  , formatik = require('formatik')
  , bodyParser = require('body-parser')
  ;

module.exports = function(config) {
  var router = express.Router()

  router.route('/-/config')
  .all(bodyParser.urlencoded({ extended: false }))
  .get(function(req, res) {
      var form = formatik.parse(req.query, {
          "key" : {
            "type" : "text",
            "required" : true,
            "pattern" : "[a-zA-Z][a-zA-Z0-9. _-]+"
          }
      }, 'fr');
      if (form.isValid()) {
        var fields = form.mget('value');
        res.json(config.get(fields.key))
      }
      else {
        res.status(400).send('Bad Request').end();
      }
    }
  )
  .post(function(req, res) {
      var form = formatik.parse(req.body, {
          "key" : {
            "type" : "text",
            "required" : true,
            "pattern" : "[a-z][a-z0-9. _-]+"
          },
          "val" : {
            "type" : "text",
            "required" : true
          }
      }, 'fr');

      if (form.isValid()) {
        var fields = form.mget('value');
        config.set(fields.key, fields.val);
        res.status(200).send('OK').end();
      }
      else {
        res.status(400).send('Bad Request').end();
      }

  });
  return router;
}