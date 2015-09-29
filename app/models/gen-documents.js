/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , url = require('url')
  , Errors = require('../helpers/errors.js')
  , Loader = require('castor-load')
  ;

module.exports = function(model) {

  model
  .declare('loaderOptions', function(req, fill) {
      fill({
        "collectionName" : req.routeParams.resourceName,
        "connexionURI" : req.config.get('connexionURI'),
        "concurrency" : req.config.get('concurrency'),
        "delay" : req.config.get('delay'),
        "maxFileSize" : req.config.get('maxFileSize'),
        "writeConcern" : req.config.get('writeConcern'),
        "ignore" : req.config.get('filesToIgnore'),
        "watch" : false
    });
})
.declare('documentURL', function(req, fill) {
    fill({
        protocol: "http",
        hostname: "127.0.0.1",
        port: req.config.get('port'),
        query: {
          plain : ""
        }
    });
})
.append('mongoResult', function(req, fill) {
    var ldr, self = this;
    ldr = new Loader(__dirname, self.loaderOptions);
    ldr.use('**/*', require('../loaders/ark.js')({
          range: req.config('applicationRange'),
          authority: req.config.get('authorityName')
    }));
    ldr.use('**/*', require('../loaders/wid.js')());
    ldr.use('**/*', require('../loaders/name.js')());

    for(var i = 0; i < req.body.count; i++) {
      self.documentURL.pathname = "/-/v3/echo/document" + String(i);
      ldr.push(url.format(self.documentURL));
    }
})
return model;

}
