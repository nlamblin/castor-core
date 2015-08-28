/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , datamodel = require('datamodel')
  , faker = require('faker')
  , assert = require('assert')
  , Errors = require('../errors.js')
  ;

module.exports = function(model) {

  model
  .declare('property', function(req, fill) {
      var property = {
        name: req.routeParams.columnName
      };
      debug('req.body', req.body);
      if (req.body && req.body.propertyLabel) {
        property.scheme = req.body.propertyScheme;
        property.type = req.body.propertyType;
        property.comment = req.body.propertyComment;
        property.label = req.body.propertyLabel;
        property.value = req.body.propertyValue;
      }
      else if (req.body) {
        property.scheme = "http://exemple.com/" + req.routeParams.columnName;
        property.label = faker.lorem.words().join(' ');
        property.value = {
          "set" : "n/a"
        }
      }
      else {
        return fill(new Errors.InvalidParameters('Some parameters is missing.'));
      }
      fill(property);
  })
  .append('mongoResult', function(req, fill) {
      var self = this;
      if (self.mongoCollectionsIndexHandle instanceof Error) {
        return fill([]);
      }
      var q = {
        "_name" : req.routeParams.resourceName
      };

      function miseajour() {
        var o1 = {
          "$push" : {
            "_columns" : {
              "propertyScheme": self.property.scheme,
              "propertyType": self.property.type,
              "propertyValue" : self.property.value,
              "propertyName" : self.property.name,
              "propertyLabel" : self.property.label,
              "propertyComment" : self.property.comment
            }
          }
        }
        self.mongoCollectionsIndexHandle.update(q, o1).then(fill).catch(fill);
      }

      if (req.body && req.body.previousName) {
        var o2 = {
          "$pull" : {
            "_columns" : {
              "propertyName": req.body.previousName
            }
          }
        }
        self.mongoCollectionsIndexHandle.update(q, o2).then(miseajour).catch(fill);
      }
      else {
        miseajour();
      }
  })

  return model;
}



