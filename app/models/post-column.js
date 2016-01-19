/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , datamodel = require('datamodel')
  , assert = require('assert')
  , extend = require('extend')
  ;

module.exports = function(model) {

  model
  .declare('property', function(req, fill) {
      var Errors = req.core.Errors;
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
        property.label = req.body.propertyLabel;
        property.value = req.body.propertyValue;
      }
      else if (req.body && req.body.propertyLabel && req.routeParams.columnName !== 'name') {
        property.scheme = req.body.propertyScheme;
        property.type = types[req.body.propertyType];
        property.comment = req.body.propertyComment;
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
      debug('property', property);
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
            "$set" : {}
          };
          var o11 = {
            "scheme": self.property.scheme,
            "type": self.property.type,
            "label" : self.property.label,
            "comment" : self.property.comment
          }
          extend(o11, self.property.value);
          o1['$set']["_columns." + self.property.name] = o11;
          debug('update', q, o11);
          self.mongoCollectionsIndexHandle.update(q, o1).then(fill).catch(fill);
        }
        else {
          debug('Dropped!');
          fill(true);
        }
      }

      if (req.body && req.body.previousName) {
        var f2 = {}
        f2['_columns.'+ req.body.previousName] = "";
        var o2 = {
          "$unset" : f2
        }
        debug("update column", q, o2);
        self.mongoCollectionsIndexHandle.update(q, o2).then(miseajour).catch(fill);
      }
      else {
        miseajour();
      }
  })

  return model;
}



