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
  .declare('headers', function(req, fill) {
      var headers = {};
      headers['Content-Type'] = require('../helpers/format.js')(req.params.format);
      if (req.params.format === 'zip') {
        headers['Content-Disposition'] = 'attachment; filename="export.zip"';
      }
      fill(headers);
  })
  .declare('site', function(req, fill) {
      fill({
          title : 'Castor',
          description : null,
      });
      })
      .declare('page', function(req, fill) {
          fill({
              title : 'Display doc',
              description : null,
              types : ['text/html', 'application/json', 'application/zip']
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
          fill({ wid : req.params.doc});
      })
      .append('item', function(req, fill) {
          coll.findOne(this.selector).then(fill).catch(fill);
      })
      .send(function(res, next) {
          res.set(this.headers);
          debug('locals', this);
          render(res, this, next);
        }
      )
      .takeout();
    }
