/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , util = require('util')
  , crypto = require('crypto')
  , datamodel = require('datamodel')
  , Render = require('castor-render')
  , Flying = require('../lib/flying.js')
  , pmongo = require('promised-mongo')
  , struct = require('object-path')
  , extend = require('extend')
  , heart = require('../helpers/heart.js')()
  , pulse = heart.newPulse()
  , lock
  , first = []
  ;

module.exports = function(config, computer) {
  var db   = pmongo(config.get('connexionURI'))
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
        "values" : computer.operators()
      },
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
      if (v.itemsPerPage === undefined || v.itemsPerPage === null) {
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
  .append('headers', function(req, fill) {
    var headers = {};
    headers['Content-Type'] = rdr.transpose(req.params.format);
    fill(headers);
  })
  .append('mongoCollection', function(req, fill) {
    if (this.parameters === false) {
      return fill();
    }
    var self = this
      , map = computer.operator(self.parameters.operator).map
      , reduce = computer.operator(self.parameters.operator).reduce
      , opts = {
          query: self.selector,
          scope: {
            exp : self.parameters.field
          }
        }
      // collection for this query (operator and opts)
      , ret = this.parameters.resource + '_' + crypto.createHash('sha1').update(self.parameters.operator + JSON.stringify(opts)).digest('hex')
      , beatoffset = pulse.missedBeats()
      ;

    debug('for ' + ret, 'beatoffset('+beatoffset+')', first.indexOf(ret));
    if (first.indexOf(ret) === -1 || (beatoffset > 2 && lock !== true) ) {
      pulse.beat();
      lock = true;
      opts.out = { merge : ret };
      debug('processing Map/Reduce, opts:', opts);
      db.collection(self.parameters.resource).mapReduce(map, reduce, opts).then(function(newcoll) {
        lock = false;
        if (first.indexOf(ret) === -1) {
          first.push(ret);
          fill(ret);
        }
      }).catch(function(e) {
        debug('error', e);
        if (first.indexOf(ret) === -1) {
          fill(e);
        }
      });
    }
    if (first.indexOf(ret) > -1) {
      fill(ret);
    }
  })
  .append('mongoQuery', function(req, fill) {
    var sel = {};
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
  .complete('recordsTotal', function(req, fill) {
    if (this.parameters === false) {
      return fill(0);
    }
    db.collection(this.mongoCollection).find().count().then(fill).catch(fill);
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
      }
    }
    db.collection(self.mongoCollection).find(self.mongoQuery, self.mongoOptions).sort(self.mongoSort).skip(self.parameters.startIndex).limit(self.parameters.itemsPerPage).toArray().then(func).catch(fill);
  })
  .send(function(res, next) {
    if (this.parameters === false) {
      return res.status(400).send('Bad Request').end();
    }
    res.set(this.headers);
    rdr.run(res, this, next);
  }
)
.takeout();
};

/*
 */
