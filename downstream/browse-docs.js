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
  .append('headers', function(req, fill) {
      var headers = {};
      headers['Content-Type'] = require('../helpers/format.js')(req.params.format);
      if (req.params.format === 'zip') {
        headers['Content-Disposition'] = 'attachment; filename="export.zip"';
      }
      fill(headers);
  })
  .append('items', function(req, fill) {
      var pageNumber = req.query.page || 1
        , nPerPage = req.query.count || config.get('itemsPerPage') || 30;
      coll.find().skip((Number(pageNumber) - 1) * nPerPage).limit(Number(nPerPage)).toArray().then(fill).catch(fill);
  })
  .send(function(res, next) {
      res.set(this.headers);
      render(res, this, next);
    }
  )
  .takeout();
}
