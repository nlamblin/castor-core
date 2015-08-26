/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , datamodel = require('datamodel')
  , faker = require('faker')
  , assert = require('assert')
  ;

module.exports = function(model) {

  model
  .append('mongoResult', function(req, fill) {
      var self = this;
      if (self.mongoDatabaseHandle instanceof Error) {
        return fill([]);
      }
      if (self.mongoCollectionsIndexHandle instanceof Error) {
        return fill([]);
      }
      var q = {
        "_name" : req.routeParams.resourceName
      };
      var o = {
        "$push" : {
          "_fields" : {
            "@id": "http://exemple.com/" + req.routeParams.columnName,
            "propertyValue" : {
              "set" : "n/a"
            },
            "propertyName" : req.routeParams.columnName,
            "propertyLabel" : faker.lorem.words().join(' ')
          }
        }
      }
      self.mongoCollectionsIndexHandle.update(q, o).then(fill).catch(fill);
  })

  return model;
}



