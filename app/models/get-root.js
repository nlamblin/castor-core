/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , Query = require('../helpers/query.js')
   ;

module.exports = function(model) {
  var qry = new Query();
  model
  .declare('mongoQuery', function(req, fill) {
      var q = qry.where(req.query.where).get('$query');
      if (req.routeParams.resourceName === 'index') {
        q = { _wid: { $ne: "index" } }
      }
      q.state = {
        $nin: [ "deleted", "hidden" ]
      };
      fill(q);
  })
  .append('template', function(req, fill) {
      var Errors = req.config.get('Errors');
      var self = this;
      if (self.mongoCollectionsIndexHandle instanceof Error) {
        return fill();
      }
      self.mongoCollectionsIndexHandle.findOne({
          "_wid" : "index"
      }).then(function(doc) {
          if (doc === null) {
            fill(new Errors.TableNotFound('The root table does not exist.'));
          }
          else  {
            fill(doc._template);
          }
      }).catch(fill);
  })
  .append('table', function(req, fill) {
      var Errors = req.config.get('Errors');
      var self = this;
      if (self.mongoCollectionsIndexHandle instanceof Error) {
        return fill();
      }

      function docsFrom(table) {
        var collection;
        if (table._wid === 'index') {
          collection = self.mongoDatabaseHandle.collection(req.config.get('collectionsIndexName'))
        }
        else {
          collection = self.mongoDatabaseHandle.collection(table._wid)
        }
        collection.find(self.mongoQuery).toArray().then(function(res) {
            table._documents = res;
            fill(table);
        }).catch(fill);
      }


      self.mongoCollectionsIndexHandle.findOne({
          "_root" : true
      }).then(function(table) {
          if (table === null) {
            fill(new Errors.TableNotFound('The root table does not exist.'));
          }
          else if (table._columns !== undefined) {
            docsFrom(table);
          }
          else if (table._columns === undefined && req.config.has('flyingFields')) {
            table._columns = req.config.get('flyingFields');
            docsFrom(table);
          }
          else if (table._columns === undefined) {
            table._columns = []
            docsFrom(table);
          }
          else {
            docsFrom(table);
          }
      }).catch(fill);
  })
  .complete('table', function(req, fill) {
      var self = this;
      Object.keys(self.table).filter(function(key) { return key[0] !== '_' }).forEach(function(key) { delete self.table[key] });
      delete self.table._id;
      fill(self.table);
  })
  .send(function(res, next) {
      var self = this;
      var template =
      String('{% extends "root.html" %}')
      .concat("\n")
      .concat('{% block body %}')
      .concat("\n")
      .concat(self.template)
      .concat("\n")
      .concat('{% endblock %}');
      res.set('Content-Type', "text/html");
      res.renderString(self.template, self.table);
  });
  return model;
}




