/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , datamodel = require('datamodel')
  , assert = require('assert')
  , Errors = require('../helpers/errors.js')
  ;

module.exports = function(model) {

  model
  .declare('property', function(req, fill) {
      var types = {
        "value" : undefined,
        "link" : "http://www.w3.org/TR/xmlschema-2/#anyURI"
      };
      var property = {
        name: req.routeParams.columnName
      };
      if (req.body && req.body.propertyLabel && req.routeParams.columnName === 'name') {
        property.scheme = req.body.propertyScheme;
        property.type = types[req.body.propertyType];
        property.comment = req.body.propertyComment;
        property.text = req.body.propertyText;
        property.label = req.body.propertyLabel;
        property.value = req.body.propertyValue;
      }
      else if (req.body && req.body.propertyLabel && req.routeParams.columnName !== 'name') {
        property.scheme = req.body.propertyScheme;
        property.type = types[req.body.propertyType];
        property.comment = req.body.propertyComment;
        property.text = req.body.propertyText;
        property.label = req.body.propertyLabel;
        property.value = req.body.propertyValue;
      }
      else if (req.body && req.body[req.routeParams.columnName] == 'true' &&  req.routeParams.columnName !== 'name') {
        property.name = false;
        req.body.previousName = req.routeParams.columnName;
      }
      else if (req.body) {
        property.scheme = "http://exemple.com/" + req.routeParams.columnName;
        property.label = 'Column ' + req.routeParams.columnName;
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
        "_wid" : req.routeParams.resourceName
      };

      function miseajour() {
        if (self.property.name) {
          var o1 = {
            "$push" : {
              "_columns" : {
                "propertyScheme": self.property.scheme,
                "propertyType": self.property.type,
                "propertyValue" : self.property.value,
                "propertyText" : self.property.text,
                "propertyName" : self.property.name,
                "propertyLabel" : self.property.label,
                "propertyComment" : self.property.comment
              }
            }
          }
          self.mongoCollectionsIndexHandle.update(q, o1).then(fill).catch(fill);
        }
        else {
          debug('Dropped!');
          fill(true);
        }
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



