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
  .declare('sort', function(req, fill) {
    var s = {};
    if (Array.isArray(req.query.order)) {
      req.query.order.forEach(function(itm) {
        if (req.query.columns && req.query.columns[itm.column] && req.query.columns[itm.column].data) {
          s[req.query.columns[itm.column].data] = itm.dir === 'asc' ? 1 : -1;
        }
      });
    }
    fill(s);
  })
  .declare('parameters', function(req, fill) {
    var schema = {
      "field" : {
        "alias": "f",
        "type" : "text",
        "array": true,
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
      },
      // see http://datatables.net/manual/server-side
      "search" : {
        "alias": [ "s"],
        "type" : "object",
        "required" : false
      },
      "order" : {
        "alias": ["sort"],
        "type" : "object",
        "required" : false,
        "array": true
      },
      "columns" : {
        "alias": ["cols"],
        "type" : "object",
        "required" : false,
        "array": true
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
    //
    // mongoQuery
    //
    var sel = {};
    require('extend')(true, sel, this.selector);
    // cf.  http://datatables.net/manual/server-side#Sent-parameters
    // Example : /browse.json?columns[i][data]=content.json.Field&columns[i][search][value]=value
    if (this.parameters.columns) {
      this.parameters.columns.forEach(function (c) {
        if (c && c.search && c.search.value) {
          sel[c.data] = c.search.value;
        }
      });
    }
    if (this.parameters.search && this.parameters.search.regex) {
      sel.text = {
        $regex : this.parameters.search.value,
        $options : 'i'
      }
    }

    var self = this, map = Operators.map(self.parameters.operator)
      , reduce = Operators.reduce(self.parameters.operator)
      , opts = {
      out : {
        replace: config.get('collectionName') + '_' + basename + '_' + self.parameters.field.join('_')
      },
      query: sel,
      scope: {
        exp : self.parameters.field
      }
    };
    coll.mapReduce(map, reduce, opts).then(function(newcoll) {
      coll2 = newcoll;
      coll2.find(self.selector, {
        skip: self.parameters.startIndex,
        limit: self.parameters.itemsPerPage,
        sort : self.sort
      }).toArray(function (err, res) {
        fill(err ? err : res);
      });
    }).catch(fill);
  })
  .append('mongoQuery', function(req, fill) {
    var sel = {};
    require('extend')(true, sel, this.selector, this.filters);
    if (this.parameters.search && this.parameters.search.regex) {
      sel.text = {
        $regex : this.parameters.search.value,
        $options : 'i'
      }
    }
    fill(sel);
  })
  .append('mongoOptions', function(req, fill) {
    fill({
      // fields : {
        // content: 0
      // }
    });
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
