'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , datamodel = require('datamodel')
  , render = require('../helpers/render.js')
  , pmongo = require('promised-mongo')
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
          title : 'Expose field',
          description : null,
          types : ['text/html', 'application/json']
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
          field: req.params.field || 'wid'
        , format: req.params.format
        , startPage: Number(req.query.page || 1)
        , nPerPage: Number(req.query.count || config.get('itemsPerPage') || 30)
      });
  })
  .append('headers', function(req, fill) {
      var headers = {};
      headers['Content-Type'] = require('../helpers/format.js')(this.parameters.format);
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
      // coll.find().count().then(function(c) { r.totalResults = c; fill(r); }).catch(function() { fill(r); });
      fill(r);
  })
  .append('items', function(req, fill) {
      var self = this;

      var opts = {
        out : {
          replace: basename + '_' + self.parameters.field
        },
        query: self.selector,
        scope: {
          fieldname: self.parameters.field
        }
      };
      coll.mapReduce(map, reduce, opts).then(function(newcoll) {
          newcoll.find().skip((self.parameters.startPage - 1) * self.parameters.nPerPage).limit(self.parameters.nPerPage).toArray(function (err, res) {
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
  .takeout();
}
