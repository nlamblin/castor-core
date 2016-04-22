
/* jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , datamodel = require('datamodel')
  , mqs = require('mongodb-querystring')
  , Loader = require('castor-load')
  ;

module.exports = function(model) {

  model
  .declare('collectionName', function(req, fill) {
    if (req.routeParams.resourceName === 'index') {
      fill(req.config.get('collectionsIndexName'))
    }
    else {
        fill(req.routeParams.resourceName);
      }
  })
  .prepend('loaderOptions', function(req, fill) {
    var self = this;
    fill({
      "collectionName" : self.collectionName,
      "connexionURI" : req.core.config.get('connectionURI'),
      "concurrency" : req.core.config.get('concurrency'),
      "delay" : req.core.config.get('delay'),
      "maxFileSize" : req.core.config.get('maxFileSize'),
      "writeConcern" : req.core.config.get('writeConcern'),
      "ignore" : req.core.config.get('filesToIgnore'),
      "watch" : false
    });
  })
  .prepend('sharedFields', function(req, fill) {
    fill({
      baseURL : String(req.core.config.get('baseURL')).replace(/\/+$/,'')
    })
  })
  .append('loaderDocs', function(req, fill) {
    var self = this;
    var ldr = new Loader(__dirname, self.loaderOptions);
    ldr.use('**/*', require('../loaders/extend.js')(self.sharedFields));
    req.core.loaders.forEach(function(loader) {
      var opts = loader[2] || {};
      if (loader[0].indexOf('.json') >= 0) {
        opts['cutter'] = '!.*';
      }
      ldr.use(loader[0], loader[1](opts));
    });
    ldr.use('**/*', function (input, submit) {
      if (typeof self.stylesheet !== 'object') {
        return submit(null, input);
      }
      JBJ.render(stylesheet, input, submit);
    });
    var c = 0;
    self.loaderFiles.forEach(function (file) {
      c++;
      debug('push', file);
      ldr.push(file, {}, {}, function(doc) {
        doc.filename = self.filename;
        doc.extension = path.extname(self.filename).replace('.', '');
        doc.typ = self.type;
      });
    })
    fill(c);
  })
  .send(function(res, next) {
    return res.sendStatus(204);
  });

  return model;
}



