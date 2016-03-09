/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , JBJ = require('jbj')
  ;

module.exports = function(model) {
  model
  .append('field', function(req, fill) {
      var Errors = req.core.Errors;
      var self = this;
      if (self.mongoDatabaseHandle instanceof Error) {
        return fill();
      }
      var q = {
          "_wid" : 'index'
      }
      self.mongoDatabaseHandle.collectionsIndex().findOne(q).then(function(doc) {
          if (doc._columns._wid === undefined) {
            fill(new Errors.PropertyNotFound('`http://purl.org/dc/elements/1.1/identifier` is missing.'));
          }
          else {
            fill(doc._columns._wid);
          }
      }).catch(fill);
  })
  .append('doc', function(req, fill) {
      var self = this;
      if (self.mongoDatabaseHandle instanceof Error) {
        return fill();
      }
      var q = {
          "_wid" : req.routeParams.resourceName
      }
      self.mongoDatabaseHandle.collectionsIndex().findOne(q).then(fill).catch(fill);
  })
  .complete('value', function(req, fill) {
      var self = this;
      if (self.field.propertyValue === undefined) {
        fill(null);
      }
      else if (typeof self.field.title === 'object') {
        JBJ.render(self.field.title, self.doc, function (err, res) {
            if (err) {
              fill(err);
            }
            else {
              fill(res);
            }
        });
      }
      else {
        fill(self.field);
      }
  })
  .send(function(res, next) {
      var self = this;
      res.set('Content-Type', 'application/json');
      res.json(this.value);
  });

  return model;
}



