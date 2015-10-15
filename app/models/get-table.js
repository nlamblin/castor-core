/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  ;

module.exports = function(model) {
  model
  .append('table', function(req, fill) {
      var Errors = req.config.get('Errors');
      var self = this;
      if (self.mongoCollectionsIndexHandle instanceof Error) {
        return fill();
      }
      self.mongoCollectionsIndexHandle.findOne({
          "_wid" : req.routeParams.resourceName
      }).then(function(doc) {
          if (doc === null && req.routeParams.resourceName === 'index') {
            self.mongoCollectionsIndexHandle.insertOne(self.indexDescription).then(function() {
                fill(self.indexDescription._columns);
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

  return model;
}



