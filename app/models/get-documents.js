/* jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , Where = require('../helpers/where.js')
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
      var w = new Where()
      var q = w.parse(req.query.where);
      if (req.routeParams.resourceName === 'index') {
        q = { _wid: { $ne: "index" } }
      }
      q.state = {
        $nin: [ "deleted", "hidden" ]
      };
      debug('mongoQuery', q);
      fill(q);
  })
  .append('mongoCursor', function(req, fill) {
      if (this.mongoDatabaseHandle instanceof Error) {
        return fill();
      }
      debug('mongoCursor on `' + this.collectionName + '`', this.mongoQuery);
      fill(this.mongoDatabaseHandle.collection(this.collectionName).find(this.mongoQuery).limit(10000));
  })


  return model;
}



