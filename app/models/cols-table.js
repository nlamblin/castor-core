/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
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
  .append('columns', function(req, fill) {
      if (this.mongoHandle instanceof Error) {
        return fill();
      }
      // fill(this.mongoHandle.collection(this.collectionName).find());
      var cols = [
        {
          label: 'Identifier',
          field : '@id'
        },
        {
          label : 'Name',
          field: 'url',
          resource: true
        },
        {
          label: 'Description',
          field : 'description'
        }
      ];
      fill(cols)
  })

  return model;
}



