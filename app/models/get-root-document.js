/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , recall = require('../helpers/recall.js')
  , async = require('async')
  ;

module.exports = function(model) {
  model
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
      var Errors = req.core.Errors;
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
      var Errors = req.core.Errors;
      var self = this;
      if (self.mongoCollectionsIndexHandle instanceof Error) {
        return fill();
      }
      var retrieve = recall({
          port: req.config.get('port')
      });

      self.mongoCollectionsIndexHandle.findOne({
          "_root" : true
      }).then(function(table) {
          if (table === null) {
            return fill(new Errors.TableNotFound('The root table does not exist.'));
          }
          async.parallel([
              function(callback) {
                retrieve({
                    pathname: '/index/' + table._wid + '/*',
                    query: {
                      alt :'json'
                    }
                }, callback);
              },
              function(callback) {
                retrieve({
                    pathname: '/' + table._wid + '/' + req.routeParams.documentName + '/',
                    query: {
                      alt :'json'
                    }
                }, callback);
              }
            ],
            function(err, results) {
              if (err) {
                fill(err)
              }
              else {
                results[1][0]._table = results[0][0];
                fill(results[1][0]);
              }
          });
      })
      .catch(fill);
  })
  .send(function(res, next) {
      var self = this;
      res.set('Content-Type', self.mimeType);
      if (self.mimeType === 'application/json') {
        res.send(self.table);
      }
      else {
        return res.render("item.html", self.table);
        /*
        var template =
        String('{% extends "item.html" %}')
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




