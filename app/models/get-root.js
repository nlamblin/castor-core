/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , Query = require('../helpers/query.js')
  , recall = require('../helpers/recall.js')
  , async = require('async')
  ;

module.exports = function(model) {
  var qry = new Query();
  model
  .declare('mimeType', function(req, fill) {
      if (req.query.alt === 'raw') {
        fill('application/json');
      }
      else if (req.query.alt === 'json') {
        fill('application/json');
      }
      else if (req.query.alt === 'nq') {
        fill('application/n-quads');
      }
      else if (req.query.alt === 'csv') {
        fill('text/csv');
      }
      else if (req.query.alt === 'tsv') {
        fill('text/tab-separated-values');
      }
      else if (req.query.alt === 'xls') {
        fill('application/vnd.ms-excel');
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
          if (self.mimeType === 'text/csv'
            || self.mimeType === 'text/tab-separated-values'
            || self.mimeType === 'application/vnd.ms-excel'
            || self.mimeType === 'application/n-quads') {
            fill({
                port: req.config.get('port'),
                pathname: '/' + table._wid + '/*',
                query: {
                  alt : req.query.alt
                }
            });
          }
          else {
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
                      pathname: '/' + table._wid + '/*',
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
                  results[0][0]._globals = {
                    prefixKEY : req.config.get('prefixKEY'),
                    prefixURL : req.config.get('prefixURL')
                  };
                  results[0][0]._documents = results[1];
                  fill(results[0][0]);
                }
            });
          }

      })
      .catch(fill);
  })
  .send(function(res, next) {
      var self = this;
      res.set('Content-Type', self.mimeType);
      if (self.mimeType === 'application/json') {
        res.send(self.table);
      }
      else if (self.mimeType === 'text/csv'
        || self.mimeType === 'text/tab-separated-values'
        || self.mimeType === 'application/vnd.ms-excel'
        || self.mimeType === 'application/n-quads') {
        recall(self.table)(res, next);
      }
      else {
        return res.render("index.html", self.table);
        /*
        var template =
        String('{% extends "index.html" %}')
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




