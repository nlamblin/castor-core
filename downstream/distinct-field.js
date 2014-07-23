'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , config  = require('../config.js')
  , datamodel = require('datamodel')
  , render = require('../helpers/render.js')
  , pmongo = require('promised-mongo')
  , coll = pmongo(config.get('connexionURI')).collection(config.get('collectionName'))
  , nPerPage = config.get('itemsPerPage') || 30
  ;

var map = function () {
  /* global fieldname, emit */
  if (this[fieldname]) {
    emit(this[fieldname], 1);
  }
};
var reduce = function (key, values) {
  var c = 0;
  print('values', values);
  values.forEach(function (cur) {
      c += cur;
    }
  );
  return c;
}


datamodel()
.declare('template', function(req, fill) {
    fill(basename + '.html');
})
.declare('params', function(req, fill) {
    fill({
        field : req.params.field || 'wid',
        format : req.params.format
    });
})
.declare('site', function(req, fill) {
    fill({
        title : 'Castor',
        description : null
    });
})
.declare('page', function(req, fill) {
    fill({
        title : 'Expose field',
        description : null,
        types : ['text/html', 'application/json']
    });
})
.declare('user', function(req, fill) {
    fill(req.user ? req.user : {});
})
.declare('url', function(req, fill) {
    fill(require('url').parse(req.protocol + '://' + req.get('host') + req.originalUrl));
})
.declare('selector', function(req, fill) {
    fill({ state: { $nin: [ "deleted", "hidden" ] } });
})
.append('headers', function(req, fill) {
    var headers = {};
    headers['Content-Type'] = require('../helpers/format.js')(this.params.format);
    fill(headers);
})
.append('items', function(req, fill) {
    var self = this , pageNumber = 1;

    var opts = {
      out : {
        replace: basename + '_' + self.params.field
      },
      query: self.selector,
      scope: {
        fieldname: self.params.field
      }
    };
    coll.mapReduce(map, reduce, opts).then(function(newcoll) {
        newcoll.find().skip((Number(pageNumber) - 1) * nPerPage).limit(nPerPage).toArray(function (err, res) {
            fill(err ? err : res)
          }
        );
    }).catch(fill);
})
.send(function(res, next) {
    res.set(this.headers);
    render(res, this, next);
  }
)
.attach(module);

