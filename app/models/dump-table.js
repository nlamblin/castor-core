/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , datamodel = require('datamodel')
  , MongoClient = require('mongodb').MongoClient
  , JSONStream = require('JSONStream')
  ;

datamodel()
.declare('mongoHandle', function(req, fill) {
    MongoClient.connect(req.config.get('connexionURI')).then(fill).catch(fill);
})
.complete('mongoHandle', function(req, fill) {
    if (this.mongoHandle instanceof Error) {
      return fill(this.mongoHandle);
    }
    this.mongoHandle.close().then(fill).catch(fill);
})
.append('cursor', function(req, fill) {
    if (this.mongoHandle instanceof Error) {
      return fill([]);
    }
    fill(this.mongoHandle.collection(req.config.get('collectionIndex')).find());
})
.send(function(res, next) {
    res.set('Content-Type', 'application/json');
    this.cursor.stream().pipe(JSONStream.stringify()).pipe(res);
})
.attach(module);



