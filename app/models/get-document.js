/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  ;

module.exports = function(model) {
  if (model === undefined) {
    model = require('datamodel')();
  }
  model
    .declare('mongoQuery', function(req, fill) {
        var q = {};
      if (req.routeParams.resourceName === 'index') {
        q = { _name: { $ne: "index" } }
      }
      else {
        q = { _name : req.routeParams.resourceName + "/" + req.routeParams.documentName }
      }
      fill(q);
  })

  return model;
}



