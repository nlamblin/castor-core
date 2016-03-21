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
  .declare('template', function(req, fill) {
    fill("item.html");
  })
  .append('locals', function(req, fill) {
    var Errors = req.core.Errors;
    var self = this;
    if (self.mongoDatabaseHandle instanceof Error) {
      return fill();
    }
    var retrieve = recall({
      port: req.config.get('port')
    });

    self.mongoDatabaseHandle.collectionsIndex().findOne({
      "_root" : true
    }).then(function(table) {
      if (table === null) {
        return fill(new Errors.TableNotFound('The root table does not exist.'));
      }
      if (self.mimeType === 'text/html') {
        async.parallel([
          function(callback) {
            retrieve({
              pathname: '/index/' + table._wid + '/*',
              query: {
                alt :'raw'
              }
            }, callback);
          },
          function(callback) {
            retrieve({
              pathname: '/' + table._wid + '/' + req.routeParams.documentName + '/*',
              query: {
                alt :'raw'
              }
            }, callback);
          }
        ],
        function(err, results) {
          if (err) {
            fill(err)
          }
          else if (results[1][0] === undefined) {
            fill(new Errors.PageNotFound('No ressource'));
          }
          else {
            results[1][0]._table = results[0][0];
            fill(results[1][0]);
          }
        });
      }
      else {
        fill({
          port: req.config.get('port'),
          pathname: '/' + table._wid + '/' + req.routeParams.documentName + '/*',
          query: {
            alt : req.query.alt
          }
        });
      }
    })
    .catch(fill);
  })
  .send(function(res, next) {
    var self = this;
   // res.set('Content-Type', 'application/json');
    // return res.send(self.locals);
    res.set('Content-Type', self.mimeType);
    if (self.mimeType === 'text/html') {
      return res.render(self.template, self.locals);
    }
    else {
      recall(self.locals)(res, next);
    }
  });
  return model;
}




