/* jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , Query = require('../helpers/query.js')
  ;

module.exports = function(model) {
  var qry = new Query();
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
      var q = qry.where(req.query.where).get('$query');
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
      var mongoSort = qry.orderBy(req.query.orderby).get('$orderby');
      var mongoLimit = Number(qry.limit(req.query.limit).get('$limit'));
      var mongoOffset = Number(qry.get('$offset'));
      var mongoCursor = this.mongoDatabaseHandle
      .collection(this.collectionName)
      .find(this.mongoQuery)
      .sort(mongoSort)
      .limit(Number.isNaN(mongoLimit) ? 25 : mongoLimit)
      .skip(Number.isNaN(mongoOffset) ? 0 : mongoOffset);
      // debug('mongoCursor on `' + this.collectionName + '`', this.mongoQuery, mongoSort, mongoLimit, mongoOffset);
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



