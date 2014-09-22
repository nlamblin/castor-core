/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , util = require('util')
  , datamodel = require('datamodel')
  , render = require('../helpers/render.js')
  , pmongo = require('promised-mongo')
  , struct = require('object-path')
  , Operators = require('../helpers/operators.js')
  ;

module.exports = function(config) {
  var coll2, coll = pmongo(config.get('connexionURI')).collection(config.get('collectionName'));

  return datamodel()
  .declare('template', function(req, fill) {
    fill(basename + '.html');
  })
  .declare('site', function(req, fill) {
    fill({
      title : config.get('title'),
      description : config.get('description')
    });
  })
  .declare('page', function(req, fill) {
    fill({
      title : config.get('pages:' + req.params.name + ':title'),
      description : config.get('pages:' + req.params.name + ':description'),
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
    var schema = {
      "field" : {
        "alias": "f",
        "type" : "text",
        "required" : true,
        "pattern" : "[a-z*-][a-z0-9*. _-]*"
      },
      "operator" : {
        "alias": "o",
        "type" : "text",
        "pattern" : "[a-z][a-z0-9. _-]+",
        "required" : true,
        "values" : Operators.keys()
      },
      "searchTerms" : {
        "alias": ["query", "search", "q"],
        "type" : "text",
        "pattern" : "[a-z*-][a-z0-9*. _-]*",
        "required" : false
      },
      "itemsPerPage" : {
        "alias": ["count", "length", "l"],
        "type" : "number",
        "required" : false
      },
      "startIndex" : {
        "alias": ["start", "i"],
        "type" : "number",
        "required" : false
      },
      "startPage" : {
        "alias": ["page", "p"],
        "type" : "number",
        "required" : false
      }
    }
    var form = require('formatik').parse(req.query, schema);
    if (form.isValid()) {
      var v = form.mget('value');
      if (!v.itemsPerPage) {
        v.itemsPerPage = config.get('itemsPerPage');
      }
      if (v.startPage) {
        v.startIndex = (v.startPage - 1) * v.itemsPerPage;
      }
      if (!v.startIndex) {
        v.startIndex = 0;
      }
      fill(v);
    }
    else {
      fill(false);
    }
  })
  .append('headers', function(req, fill) {
    var headers = {};
    headers['Content-Type'] = require('../helpers/format.js')(req.params.format);
    fill(headers);
  })
 .append('data', function(req, fill) {
    if (this.parameters === false) {
      return fill({});
    }
    var self = this, map = Operators.map(self.parameters.operator)
      , reduce = Operators.reduce(self.parameters.operator)
      , opts = {
      out : {
        replace: basename + '_' + self.parameters.field
      },
      query: self.selector,
      scope: {
        exp : self.parameters.field
      }
    };
    coll.mapReduce(map, reduce, opts).then(function(newcoll) {
      coll2 = newcoll;
      coll2.find(self.selector, {
        skip: self.parameters.startIndex,
        limit: self.parameters.itemsPerPage
      }).toArray(function (err, res) {
        console.log('res', res);
        fill(err ? err : res);
      });
    }).catch(fill);
  })
  .complete('recordsTotal', function(req, fill) {
    if (this.parameters === false) {
      return fill(0);
    }
    coll2.count(this.selector, function(err, res) {
      fill(err ? err : res);
    });
  })
  .complete('recordsFiltered', function(req, fill) {
    if (this.parameters === false) {
      return fill(0);
    }
    coll2.count(this.selector, function(err, res) {
      fill(err ? err : res);
    });
  })
  .transform(function(req, fill) {
    var self = this;
    if (self.parameters !== false) {
      self.data = Operators.finalize(self.parameters.operator)(self.data);
    }
    fill(self);
  })
  .send(function(res, next) {
    if (this.parameters === false) {
      return res.status(400).send('Bad Request').end();
    }
    res.set(this.headers);
    render(res, this, next);
  }
)
.takeout();
};
