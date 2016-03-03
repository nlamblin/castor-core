/* jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , mq = require('../helpers/query.js')
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
    var q = Object(mq(req.query, '$query', {}));
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
      var mongoSort = Object(mq(req.query, '$sort', {}));
      var mongoLimit = Number(mq(req.query, '$limit',  10));
      var mongoOffset = Number(mq(req.query, '$offset', 0));
      var mongoCursor = this.mongoDatabaseHandle
      .collection(this.collectionName)
      .find(this.mongoQuery)
      .sort(mongoSort)
      .limit(Number.isNaN(mongoLimit) ? 25 : mongoLimit)
      .skip(Number.isNaN(mongoOffset) ? 0 : mongoOffset);
      debug('mongoCursor on `' + this.collectionName + '`', this.mongoQuery, mongoSort, mongoLimit, mongoOffset);
      fill(mongoCursor);
  })
  .append('mongoCounter', function(req, fill) {
      if (this.mongoDatabaseHandle instanceof Error) {
        return fill();
      }
      this.mongoDatabaseHandle.collection(this.collectionName).count(this.mongoQuery).then(fill).catch(fill);
  })



  return model;
}



