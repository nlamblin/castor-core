/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , datamodel = require('datamodel')
  , MongoClient = require('mongodb').MongoClient
  , JSONStream = require('JSONStream')
  ;

module.exports = function(model) {
  model
  .declare('collectionName', function(req, fill) {
      if (req.params.resourcename === 'index') {
        fill(req.config.get('collectionIndex'))
      }
      else {
        fill(req.params.resourcename);
      }
  })
  .append('mongoCursor', function(req, fill) {
      if (this.mongoHandle instanceof Error) {
        return fill();
      }
      fill(this.mongoHandle.collection(this.collectionName).find());
  })
  .send(function(res, next) {
      var self = this;
      res.set('Content-Type', 'application/json');
      res.on('finish', function() {
          self.mongoHandle.close();
      });
      this.mongoCursor.stream().pipe(JSONStream.stringify()).pipe(res);
  });

  return model;
}



