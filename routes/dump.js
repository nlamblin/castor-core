/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , util = require('util')
  , pmongo = require('promised-mongo')
  ;

module.exports = function(config) {
  var coll = pmongo(config.get('connexionURI')).collection(config.get('collectionName'));

  return function (req, res, next) {

    var id = req.params.doc
      , schema = { "xml" : {
          "transform" : {
            "type" : "text",
            "required" : false
          }
        },
        "json" : {
        }
      }
      ;

    if (!schema[req.params.format]) {
      return res.status(400).send('Bad Request').end();
    }

    var form = require('formatik').parse(req.query || {}, schema[req.params.format], 'fr');

    if (form.isValid()) {
      var data = {}
        , fields = form.mget('value')
        , selector = { wid : req.params.doc };

      coll.findOne(selector)
      .then(function(o) {
        res.set('Content-Type', require('../helpers/format.js')(req.params.format));
        res.status(200);
        res.send(o.content[req.params.format]);
        res.end();
      })
      .catch(function(e) {
        res.status(500).send('Internal Server Error').end();
      });
    }
    else {
      res.status(400).send('Bad Request').end();
    }
  };
};

