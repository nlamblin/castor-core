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
      var f = new Function('d', 'return d.' + x.replace(/[^\w\._$]/g, ''));
      emit(x + '=' + f(doc), 1);
    }
  )
};

var reduce = function (key, values) {
  var c = 0;
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
          fields : req.params.fields.split(',') || ['wid']
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
  .append('items', function(req, fill) {
      var self = this;
      var opts = {
        out : {
          replace: basename + '_' + self.parameters.fields.join('_')
        },
        query: self.selector,
        scope: {
          fields: self.parameters.fields
        }
      };
      debug('opts', opts);

      coll.mapReduce(map, reduce, opts).then(function(newcoll) {
          newcoll.find().skip((self.parameters.startPage - 1) * self.parameters.nPerPage).limit(self.parameters.nPerPage).toArray(function (err, res) {
              fill(err ? err : res)
            }
          );
      }).catch(fill);
  })
  .transform(function(req, fill) {
      var n = this, r = {};
      this.items.each(function(e) {
          var id = e._id.split('=', 1).shift(),
              value = e._id.slice(e._id.indexOf('=') + 1),
              count = e.value;
          if (r[id] === undefined) {
            r[id] = [];
          }
          r[id].push({value: value, count:count});
      });
      n.items = r;
      fill(n);
  })
  .send(function(res, next) {
      res.set(this.headers);
      render(res, this, next);
    }
  )
  .takeout();
}
