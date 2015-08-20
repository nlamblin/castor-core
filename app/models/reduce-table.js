/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , JBJ = require('jbj')
  , Errors = require('../errors.js')
  ;

module.exports = function(model) {
  model
  .declare('mongoQuery', function(req, fill) {
      fill({
          "@id" : req.params.resourcename
      });
  })
  .append('doc', function(req, fill) {
      if (this.mongoDatabaseHandle instanceof Error) {
        return fill();
      }
      this.mongoCollectionsIndexHandle.findOne(this.mongoQuery).then(fill).catch(fill);
  })
  .complete('value', function(req, fill) {
      debug('doc', this.doc);

      var reducer = this.doc._fields.filter(function(d) {
          return d["@id"] === "http://schema.org/name";
      }).shift();

      if (reducer.template) {
        JBJ.render(reducer.template, this.doc, function (err, res) {
          debug('res', res);
          if (err) {
            fill(err);
          }
          else {
            fill(res);
          }
      });
    }
    else {
      fill(new Errors.PropertyNotFound('`http://schema.org/name` is missing.'));
    }
  })
  .send(function(res, next) {
      var self = this;
      res.set('Content-Type', 'application/json');
      res.json(this.value);
  });

  return model;
}



