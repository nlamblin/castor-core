/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , MongoClient = require('mongodb').MongoClient
  ;


module.exports = function(model) {
  model
  .declare('mongoHandle', function(req, fill) {
      MongoClient.connect(req.config.get('connexionURI')).then(fill).catch(fill);
  })
  .complete('mongoHandle', function(req, fill) {
      if (this.mongoHandle instanceof Error || this.mongoCursor !== undefined) {
        return fill(this.mongoHandle);
      }
      this.mongoHandle.close().then(fill).catch(fill);
  })
  return model;
}

