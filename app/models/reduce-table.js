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
  .append('field', function(req, fill) {
      if (this.mongoCollectionsIndexHandle instanceof Error) {
        return fill();
      }
      var q = {
          "_name" : 'index'
      }
      this.mongoCollectionsIndexHandle.findOne(q).then(function(doc) {
          var field = doc._columns.filter(function(d) {
              return d.propertyScheme === "http://schema.org/name";
          }).shift();
          if (field === undefined) {
            fill(new Errors.PropertyNotFound('`http://schema.org/name` is missing.'));
          }
          else {
            fill(field);
          }
      }).catch(fill);
  })
  .append('doc', function(req, fill) {
      if (this.mongoCollectionsIndexHandle instanceof Error) {
        return fill();
      }
      var q = {
          "_name" : req.routeParams.resourceName
      }
      this.mongoCollectionsIndexHandle.findOne(q).then(fill).catch(fill);
  })
  .complete('value', function(req, fill) {
      var self = this;
      if (self.field.propertyValue === undefined) {
        fill(null);
      }
      else if (typeof self.field.propertyValue === 'object') {
        JBJ.render(self.field.propertyValue, self.doc, function (err, res) {
            if (err) {
              fill(err);
            }
            else {
              fill(res);
            }
        });
      }
      else {
        fill(self.field.propertyValue);
      }
  })
  .send(function(res, next) {
      var self = this;
      res.set('Content-Type', 'application/json');
      res.json(this.value);
  });

  return model;
}



