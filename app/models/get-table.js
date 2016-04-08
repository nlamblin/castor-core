/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  ;

module.exports = function(model) {
  model
    .declare('defaultDescription', function(req, fill) {
    fill({
      "fid": "__change__me__",       // pour être compatible castor-load
      "number": 0,          // pour être compatible castor-load
      "state": "inserted",  // pour être compatible castor-load
      "_wid": "__change__me__",
      "_label": 'Default Description',
      "_text": "This is the default description for all tables that are not registered in the index.",
      "_hash": null,
      "_template": null,
      "_root": true
    });
  })
  .append('table', function(req, fill) {
      var Errors = req.core.Errors;
      var self = this;
      if (self.mongoDatabaseHandle instanceof Error) {
        return fill();
      }
      self.mongoDatabaseHandle.collectionsIndex().findOne({
          "_wid" : req.routeParams.resourceName
      }).then(function(doc) {
        if (doc === null) {
            self.defaultDescription.fid = req.routeParams.resourceName;
            self.defaultDescription._wid = req.routeParams.resourceName;
            self.defaultDescription._label = 'Table ' + req.routeParams.resourceName;
            if (req.routeParams.resourceName === req.config.get('collectionName')) {
              self.defaultDescription._columns = req.config.copy('hotfolderColumns')
            }
            else if (req.routeParams.resourceName === 'index') {
              self.defaultDescription._columns = req.config.copy('hotfolderColumns')
            }
            else {
              self.defaultDescription._columns = req.config.copy('defaultColumns')
            }
            fill(self.defaultDescription);
          }
          else if (doc._columns === undefined) {
            if (req.routeParams.resourceName === req.config.copy('collectionName')) {
              doc._columns = req.config.copy('hotfolderColumns')
            }
            else if (req.routeParams.resourceName === 'index') {
              doc._columns = req.config.copy('hotfolderColumns')
            }
            else {
              doc._columns = req.config.copy('defaultColumns')
            }
            fill(doc);
          }
          else {
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



