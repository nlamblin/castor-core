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
  /* global fields, emit */
  var doc = this;
  fields.forEach(function (x) {
      emit(x, doc[x]);
    }
  )
};

var reduce = function (key, values) {
  var o = {}, i, j, l = values.length, r = [];
  for (i = 0; i < l; i += 1) {
    o[values[i]] = values[i];
  }
  for (j in o) {
    if (o[j]) {
      r.push(o[j]);
    }
  }
  return r.toString();
}


module.exports = function(config) {
  var coll = pmongo(config.get('connexionURI')).collection(config.get('collectionName'))
    , nPerPage = config.get('itemsPerPage') || 30
    ;

  return datamodel()
  .declare('template', function(req, fill) {
      fill(basename + '.html');
  })
  .declare('params', function(req, fill) {
      fill({
          fields : req.params.fields.split(',') || ['wid'],
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
          replace: basename + '_' + self.params.fields.join('_')
        },
        query: self.selector,
        scope: {
          fields: self.params.fields
        }
      };
      debug('opts', opts);

      coll.mapReduce(map, reduce, opts).then(function(newcoll) {
          newcoll.find().skip((Number(pageNumber) - 1) * nPerPage).limit(nPerPage).toArray(function (err, res) {
              fill(err ? err : res)
            }
          );
      }).catch(fill);
  })
  .transform(function(req, fill) {
      var n = this;
      n.items = this.items.map(function(e) { return { _id: e._id, values: e.value.split(',') } });
      fill(n);
  })
  .send(function(res, next) {
      res.set(this.headers);
      render(res, this, next);
    }
  )
  .takeout();
}
