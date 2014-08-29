'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , pmongo = require('promised-mongo')
  , struct = require('object-path')
  ;

module.exports = function(config) {
  var coll = pmongo(config.get('connexionURI')).collection(config.get('collectionName'));

  return function (req, res, next) {

    var form = require('formatik').parse(req.body, {
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
      var data = {}
        , fields = form.mget('value')
        , selector = { wid : req.params.doc };

      struct.set(data, fields.key, fields.val);

      debug('save', selector, data);

      coll.update(selector, { $set : data })
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
  }
}

