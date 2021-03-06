/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , formatik = require('formatik')
  , bodyParser = require('body-parser')
  ;

module.exports = function(router) {

  router.route('/-/v3/config.js(on|)')
  .get(function (req, res) {
      res.set('Content-Type', 'text/javascript');
      res.jsonp(req.config.expose());
  });

  router.route('/config.js(on|)')
  .get(function(req, res) {
      console.warn('Depretacted route, use /-/v3/config.js');
      res.set('Content-Type', 'text/javascript');
      res.jsonp(req.config.expose());
  });



  router.route('/-/v3/config')
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
        res.json(req.config.get(fields.key))
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
        req.config.set(fields.key, fields.val);
        res.status(200).send('OK').end();
      }
      else {
        res.status(400).send('Bad Request').end();
      }

  });
}
