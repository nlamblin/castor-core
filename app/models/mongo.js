/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , datamodel = require('datamodel')
  , MongoClient = require('mongodb').MongoClient
  ;


module.exports = function(model) {
  if (model === undefined) {
    model = datamodel();
  }
  model.declare('mongoHandle', function(req, fill) {
      MongoClient.connect(req.config.get('connexionURI')).then(fill).catch(fill);
  })
  .complete('mongoHandle', function(req, fill) {
      if (this.mongoHandle instanceof Error) {
        return fill(this.mongoHandle);
      }
      this.mongoHandle.close().then(fill).catch(fill);
  })
  return model;
}

