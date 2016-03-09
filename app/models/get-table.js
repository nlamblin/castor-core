/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  ;

module.exports = function(model) {
  model
  .append('table', function(req, fill) {
      var Errors = req.core.Errors;
      var self = this;
      if (self.mongoDatabaseHandle instanceof Error) {
        return fill();
      }
      self.mongoDatabaseHandle.collectionsIndex().findOne({
          "_wid" : req.routeParams.resourceName
      }).then(function(doc) {
          if (doc === null && req.routeParams.resourceName === 'index') {
            self.mongoDatabaseHandle.collectionsIndex().insertOne(self.indexDescription).then(function() {
                fill(self.indexDescription);
            }).catch(fill);
          }
          else if (doc === null && req.routeParams.resourceName !== 'index') {
            fill(new Errors.TableNotFound('The table does not exist.'));
          }
          else if (doc._columns !== undefined) {
            fill(doc);
          }
          else if (doc._columns === undefined && req.config.has('flyingFields')) {
            doc._columns = req.config.get('flyingFields');
            fill(doc);
          }
          else if (doc._columns === undefined) {
            doc._columns = []
            fill(doc);
          }
      }).catch(fill);
  })
  .complete('table', function(req, fill) {
      var self = this;
      if (req.routeParams.resourceName === 'index') {
        self._index = true;
      }
      Object.keys(self.table).filter(function(key) { return key[0] !== '_' }).forEach(function(key) { delete self.table[key] });
      delete self.table._id;
      fill(self.table);
  })



  return model;
}



