/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , util = require('util')
  , datamodel = require('datamodel')
  , extend = require('extend')
  , Render = require('castor-render')
  , Flying = require('../lib/flying.js')
  , pmongo = require('promised-mongo')
  ;

module.exports = function(config) {
  var db = pmongo(config.get('connexionURI'))
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
      types : ['text/html', 'application/atom+xml', 'application/rss+xml', 'application/json', 'application/zip', 'text/csv']
    });
  })
  .declare('draw', function(req, fill) {
    fill(parseInt(req.query.draw, 10));
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
      "selector" : {
        "alias": ["sel", "select"],
        "type" : "text"
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
      },
      "flying" : {
        "alias": ["flyingFields", "ff"],
        "type" : "string",
        "required" : false,
        "array": true
      },
      "resource" : {
        "alias": ["r", "rsc"],
        "type" : "string",
        "required" : false,
        "values": Object.keys(config.get('resources'))
      }
    };
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
      if (!v.resource) {
        v.resource = config.get('collectionName');
      }
      else {
        v.resource = config.get('collectionName') + '_resources_' + v.resource;
      }
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
    fill(sel);
  })
  .declare('mongoSort', function(req, fill) {
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
  .prepend('mongoCollection', function(req, fill) {
    fill(this.parameters.resource);
  })
  .append('headers', function(req, fill) {
    var headers = {};
    headers['Content-Type'] = rdr.transpose(req.params.format);
    if (req.params.format === 'zip') {
      headers['Content-Disposition'] = 'attachment; filename="export.zip"';
    }
    fill(headers);
  })
  .append('recordsTotal', function(req, fill) {
    if (this.parameters === false) {
      return fill(0);
    }
    db.collection(this.mongoCollection).find(this.selector).count().then(fill).catch(fill);
  })
  .append('mongoQuery', function(req, fill) {
    var sel = {};
    require('extend')(true, sel, this.selector);
    // cf.  http://datatables.net/manual/server-side#Sent-parameters
    // Example : /browse.json?columns[i][data]=content.json.Field&columns[i][search][value]=value
    if (this.parameters.columns) {
      this.parameters.columns.forEach(function (c) {
        if ( c && c.search && c.search.value) {
          sel[c.data] = c.search.value;
        }
      });
    }
    if (this.parameters.search && this.parameters.search.regex  && this.parameters.search.value !== '') {
      sel.text = {
        $regex : this.parameters.search.value,
        $options : 'i'
      };
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
  .complete('recordsFiltered', function(req, fill) {
    if (this.parameters === false) {
      return fill(0);
    }
    db.collection(this.mongoCollection).find(this.mongoQuery, this.mongoOptions).count().then(fill).catch(fill);
  })
  .complete('data', function(req, fill) {
    var self = this;
    if (self.parameters === false) {
      return fill({});
    }
    var func = fill;
    if (self.parameters.flying) {
      func = function(r) {
        fly.affix(self.parameters.flying, r, fill);
      };
    }
    db.collection(this.mongoCollection).find(self.mongoQuery, self.mongoOptions).sort(self.mongoSort).skip(self.parameters.startIndex).limit(self.parameters.itemsPerPage).toArray().then(func).catch(fill);
  })
  .send(function(res, next) {
    res.set(this.headers);
    rdr.run(res, this, next);
  }
)
.takeout();
};
