'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , datamodel = require('datamodel')
  , render = require('../helpers/render.js')
  , pmongo = require('promised-mongo')
  ;

module.exports = function(config) {
  var coll = pmongo(config.get('connexionURI')).collection(config.get('collectionName'))
    ;

  return datamodel()
  .declare('template', function(req, fill) {
      fill(basename + '.html');
  })
  .declare('site', function(req, fill) {
      fill({
          title : 'Castor',
          description : null
      });
  })
  .declare('page', function(req, fill) {
      fill({
          title : 'Browse by documents',
          description : null,
          types : ['text/html', 'application/atom+xml', 'application/rss+xml', 'application/json', 'application/zip']
      });
  })
  .declare('user', function(req, fill) {
      fill(req.user ? req.user : {});
  })
  .declare('config', function(req, fill) {
      fill(config.get());
  })
  .declare('url', function(req, fill) {
      fill(require('url').parse(req.protocol + '://' + req.get('host') + req.originalUrl));
  })
  .declare('selector', function(req, fill) {
      fill({ state: { $nin: [ "deleted", "hidden" ] } });
  })
  .declare('parameters', function(req, fill) {
      fill({
          startPage: Number(req.query.page || 1)
        , nPerPage: Number(req.query.count || config.get('itemsPerPage') || 30)
      });
  })
  .append('headers', function(req, fill) {
      var headers = {};
      headers['Content-Type'] = require('../helpers/format.js')(req.params.format);
      if (req.params.format === 'zip') {
        headers['Content-Disposition'] = 'attachment; filename="export.zip"';
      }
      fill(headers);
  })
  .append('response', function(req, fill) {
      var r = {
        totalResults: 0
      , startIndex: ((this.parameters.startPage - 1) * this.parameters.nPerPage) + 1
      , itemsPerPage: this.parameters.itemsPerPage
      , startPage: this.parameters.startPage
        //,  searchTerms:
      }
      coll.find().count().then(function(c) { r.totalResults = c; fill(r); }).catch(function() { fill(r); });
  })
  .append('items', function(req, fill) {
      coll.find().skip((this.parameters.startPage - 1) * this.parameters.nPerPage).limit(this.parameters.nPerPage).toArray().then(fill).catch(fill);
  })
  .send(function(res, next) {
      res.set(this.headers);
      render(res, this, next);
    }
  )
  .takeout();
}
