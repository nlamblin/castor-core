/* jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  ;

module.exports = function(model) {
  if (model === undefined) {
    model = require('datamodel')();
  }
  model
  .declare('collectionName', function(req, fill) {
      if (req.routeParams.resourceName === 'index') {
        fill(req.config.get('collectionsIndexName'))
      }
      else {
        fill(req.routeParams.resourceName);
      }
  })
  .declare('mongoQuery', function(req, fill) {
      var q = {};
      if (req.routeParams.resourceName === 'index') {
        q = { _name: { $ne: "index" } }
      }
      fill(q);
  })
  .append('mongoCursor', function(req, fill) {
      if (this.mongoDatabaseHandle instanceof Error) {
        return fill();
      }
      fill(this.mongoDatabaseHandle.collection(this.collectionName).find(this.mongoQuery));
  })


  return model;
}



