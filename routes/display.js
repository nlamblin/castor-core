'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , util = require('util')
  , datamodel = require('datamodel')
  , Render = require('castor-render')
  , pmongo = require('promised-mongo')
  ;

module.exports = function(config) {
  var coll = pmongo(config.get('connexionURI')).collection(config.get('collectionName'))
      , rdr = new Render()
    ;


  return datamodel()
  .declare('template', function(req, fill) {
    fill(basename + '.html');
  })
  .declare('headers', function(req, fill) {
    var headers = {};
    headers['Content-Type'] = rdr.transpose(req.params.format);
    if (req.params.format === 'zip') {
      headers['Content-Disposition'] = 'attachment; filename="export.zip"';
    }
    fill(headers);
  })
  .declare('site', function(req, fill) {
    fill({
      title : config.get('title'),
      description : config.get('description')
    });
  })
  .declare('page', function(req, fill) {
    fill({
      title : config.get('pages:display:title') || 'Display document',
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
    rdr.run(res, this, next);
  })
  .takeout();
}
