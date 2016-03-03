/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , JBJ = require('jbj')
  , mq = require('../helpers/query.js')
  ;

module.exports = function(model) {
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
      fill(q);
  })
  .declare('field', function(req, fill) {
      /*
      if (req.query.field    else {
        return fill(new Errors.InvalidParameters('Bad field.'));
      }
      */
     if (Array.isArray(req.query.field)) {
       fill(req.query.field);
     }
     else if (req.query.field) {
       fill([req.query.field]);
     }
     else {
      fill(['_wid']);
    }
  })
  .prepend('results', function(req, fill) {
      var self = this;
      if (self.mongoDatabaseHandle instanceof Error) {
        return fill();
      }
      var opts = {
        query: self.mongoQuery,
        out: { inline: 1 },
        scope: {
          exp : self.field
        }
      }
      debug('collectionName', self.collectionName);
      debug('mapReduce', opts);
      self.mongoDatabaseHandle.collection(self.collectionName).mapReduce(req.routeParams.operator.map, req.routeParams.operator.reduce, opts).then(function(output) {
          if (output.results) {
            fill(output.results);
          }
          else {
            fill(new Error('No result.'));
          }
      }).catch(fill);
  })
  .send(function(res, next) {
      var self = this;
      res.set('Content-Type', 'application/json');
      res.json(this.results);
  });

  return model;
}



