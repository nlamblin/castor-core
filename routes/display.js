'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , util = require('util')
  , datamodel = require('datamodel')
  , Render = require('castor-render')
  , Flying = require('castor-compute').Flying
  , extend = require('extend')
  , pmongo = require('promised-mongo')
  ;

module.exports = function(config) {
  var coll = pmongo(config.get('connexionURI')).collection(config.get('collectionName'))
    , rdr = new Render()
    , flyopts = {
        "connexionURI" : config.get('connexionURI'),
        "collectionName": config.get('collectionName'),
        "concurrency" : config.get('concurrency')
      }
    , fly = new Flying(config.get('flyingFields'), flyopts)
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
  .declare('parameters', function(req, fill) {
    var schema = {
      "selector" : {
        "alias": ["sel", "select"],
        "type" : "text"
      },
      "flying" : {
        "alias": ["flyingFields", "ff"],
        "type" : "string",
        "required" : false,
        "array": true
      }

    };
    var form = require('formatik').parse(req.query, schema);
    if (form.isValid()) {
      var v = form.mget('value');
      fill(v);
    }
    else {
      fill(false);
    }
  })
  .prepend('selector', function(req, fill) {
    var self = this, sel;
    try {
      sel = JSON.parse(self.parameters.selector, function(key, value) {
        return typeof value !== 'function' ? value : undefined;
      });
    }
    catch(e) {
      sel = {};
    }
    if (typeof sel !== 'object' || sel === null || sel === undefined) {
      sel = {};
    }
    extend(sel, { state: { $nin: [ "deleted", "hidden" ] } });

    sel.wid = req.params.doc;
    fill(sel);
  })
  .append('data', function(req, fill) {
    var self = this;
    if (self.parameters === false) {
      return fill({});
    }
    var func = fill;
    if (self.parameters.flying) {
      func = function(r) {
        fly.affix(self.parameters.flying, r, fill);
      }
    }
    coll.findOne(self.selector).then(func).catch(fill);
  })
  .send(function(res, next) {
    res.set(this.headers);
    rdr.run(res, this, next);
  })
  .takeout();
}
