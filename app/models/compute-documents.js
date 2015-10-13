/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , JBJ = require('jbj')
  , Errors = require('../helpers/errors.js')
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
  .declare('selector', function(req, fill) {
      fill({});
  })
  .declare('field', function(req, fill) {
      fill(['_wid']);
  })
  .prepend('results', function(req, fill) {
      var self = this;
      if (self.mongoDatabaseHandle instanceof Error) {
        return fill();
      }
      var opts = {
        query: self.selector,
        out: { inline: 1 },
        scope: {
          exp : self.field
        }
      }

      debug(opts);
      self.mongoDatabaseHandle.collection(self.collectionName).mapReduce(req.routeParams.operator.map, req.routeParams.operator.reduce, opts).then(function(newcoll) {
          newcoll.find().toArray().then(function(results) {
              fill(results);
          }).catch(fill);
      }).catch(fill);
  })
  .send(function(res, next) {
      var self = this;
      res.set('Content-Type', 'application/json');
      res.json(this.results);
  });

  return model;
}



