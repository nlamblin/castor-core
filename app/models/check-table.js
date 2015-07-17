/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , datamodel = require('datamodel')
  , faker = require('faker')
  , Errors = require('../errors.js')
  ;

module.exports = function(model) {
  if (model === undefined) {
    model = datamodel();
  }
  model.declare('page', function(req, fill) {
      fill({
          fakeName : faker.lorem.words().join('-')
      });
  })
  .declare('parameters', function(req, fill) {
      fill(req.query);
  })
  .declare('mongoQuery', function(req, fill) {
      var q = {
        "@id": req.params.resource
      }
      fill(q);
  })
  .append('table', function(req, fill) {
      if (this.mongoHandle instanceof Error) {
        return fill([]);
      }
      this.mongoHandle.collection(req.config.get('collectionIndex'))
      .findOne(this.mongoQuery)
      .then(function(doc) {
          debug('doc', doc);
          if (!doc) {
            fill(new Errors.TableNotFound('The table does not exist.'));
          }
          else {
            fill(doc);
          }
      })
      .catch(fill);
  })
  return model;
}
