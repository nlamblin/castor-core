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
          "_name" : req.params.resourcename
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

      var field = this.doc._fields.filter(function(d) {
          return d["@id"] === "http://schema.org/name";
      }).shift();

      if (field === undefined) {
        fill(new Errors.PropertyNotFound('`http://schema.org/name` is missing.'));
      }
      else if (field.propertyValue === undefined) {
        fill(null);
      }
      else if (typeof field.propertyValue === 'object') {
        JBJ.render(field.propertyValue, this.doc, function (err, res) {
            if (err) {
              fill(err);
            }
            else {
              fill(res);
            }
        });
      }
      else {
        fill(field.propertyValue);
      }
  })
  .send(function(res, next) {
      var self = this;
      res.set('Content-Type', 'application/json');
      res.json(this.value);
  });

  return model;
}



