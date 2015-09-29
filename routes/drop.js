/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , util = require('util')
  , pmongo = require('promised-mongo')
  ;

module.exports = function(config) {
  var coll = pmongo(config.get('connectionURI')).collection(config.get('collectionName'));

  return function (req, res, next) {

    var form = require('formatik').parse(req.body, {
      "key" : {
        "type" : "text",
        "required" : true,
        "pattern" : "[a-z][a-z0-9. _-]+"
      }
    }, 'fr');

    if (form.isValid()) {
      var data = {}
        , fields = form.mget('value')
        , selector = { wid : req.params.doc };

      data[fields.key] = "";

      debug('save', selector, data);

      coll.update(selector, { $unset : data })
      .then(function() {
        res.status(200).send('OK').end();
      })
      .catch(function() {
        res.status(500).send('Internal Server Error').end();
      });
      res.status(200).send('OK').end();
    }
    else {
      res.status(400).send('Bad Request').end();
    }
  };
};

