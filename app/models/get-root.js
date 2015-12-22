/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , Query = require('../helpers/query.js')
  , recall = require('../helpers/recall.js')
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
  .declare('mimeType', function(req, fill) {
      if (req.query.alt === 'raw') {
        fill('application/json');
      }
      else if (req.query.alt === 'json') {
        fill('application/json');
      }
      else {
        fill('text/html');
      }
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
      var request = recall({
          port: req.config.get('port')
      });



      function docsFrom(table) {
       
        request({
            pathname: '/' + table._wid + '/*',
            query: {
              alt :'json'
            }
          }, function(err, res) {
            if (err) {
              fill(err)
            }
            else {
              table._documents = res;
              fill(table);
            }
        })
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
      res.set('Content-Type', self.mimeType);
      if (self.mimeType === 'application/json') {
        res.send(self.table);
      }
      else {
        return res.render("root.html", self.table);
        /*
        var template =
        String('{% extends "root.html" %}')
        .concat("\n")
        .concat('{% block body %}')
        .concat("\n")
        .concat(self.template)
        .concat("\n")
        .concat('{% endblock %}');
        res.renderString(self.template, self.table);
        */
      }
  });
  return model;
}




