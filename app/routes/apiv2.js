/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , express = require('express')
  , formatik = require('formatik')
  , bodyParser = require('body-parser')
  , MongoClient = require('mongodb').MongoClient
  , datamodel = require('datamodel')
  , Render = require('castor-render')
  , Flying = require('../helpers/flying.js')
  , extend = require('extend')
  , heart = require('../helpers/heart.js')()
  , crypto = require('crypto')
  , pulse = heart.newPulse()
  , lock
  , first = []
  ;

module.exports = function(config, computer) {
  var router = express.Router()

  //
  // Define route parameters
  //
  /*
  router.param('format', function(req, res, next, value) {
      debug('format', value);
      req.params.format = value;
      next();
  });
  */

  router.route('/-/v2/compute.:format')
  .get(function (req, res, next) {
      var  rdr = new Render()
        , flyopts = {
            "connexionURI" : config.get('connexionURI'),
            "collectionName": config.get('collectionName'),
            "concurrency" : config.get('concurrency')
          }
        , fly = new Flying(config.get('flyingFields'), flyopts)
        ;


      datamodel()
      .declare('mongoDatabaseHandle', function(req, fill) {
          MongoClient.connect(req.config.get('connexionURI')).then(fill).catch(fill);
      })
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
              "pattern" : "^[a-zA-Z-][a-zA-Z0-9. _-]*$"
            },
            "operator" : {
              "alias": "o",
              "type" : "text",
              "pattern" : "^[a-z][a-z0-9. _-]+$",
              "required" : true,
              "values" : computer.operators()
            },
            "selector" : {
              "alias": ["sel", "select"],
              "type" : "text"
            },
            "query" : {
              "alias": ["q"],
              "type": "text"
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
            },
            "firstOnly" : {
              "alias": ["fo"],
              "type" : "boolean",
              "required" : false
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
            if (this.mongoDatabaseHandle instanceof Error) {
              return fill();
            }
            self.mongoDatabaseHandle.collection(self.parameters.resource).mapReduce(map, reduce, opts).then(function(newcoll) {
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
          if (this.parameters.query) {
            var self = this;
            var q;
            try {
              q = JSON.parse(self.parameters.query, function(key, value) {
                  return typeof value !== 'function' ? value : undefined;
              });
            }
            catch(e) {
              q = {};
            }
            if (typeof q !== 'object' || q === null ||q === undefined) {
              q = {};
            }
            sel.value = q;
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
          if (this.mongoDatabaseHandle instanceof Error) {
            return fill();
          }
          this.mongoDatabaseHandle.collection(this.mongoCollection).find().count().then(fill).catch(fill);
      })
      .complete('recordsFiltered', function(req, fill) {
          if (this.parameters === false) {
            return fill(0);
          }
          if (this.mongoDatabaseHandle instanceof Error) {
            return fill();
          }
          this.mongoDatabaseHandle.collection(this.mongoCollection).find(this.mongoQuery, this.mongoOptions).count().then(fill).catch(fill);
      })
      .complete('data', function(req, fill) {
          var self = this;
          if (self.parameters === false) {
            return fill({});
          }
          var func = fill;
          if (self.parameters.flying) {
            func = function(r) {
              fly.affix(self.parameters.flying, self.parameters.firstOnly && Array.isArray(r) ? r[0] : r, fill);
            };
          }
          else {
            func = function(r) {
              fill(self.parameters.firstOnly && Array.isArray(r) ? r[0] : r);
            }
          }
          if (this.mongoDatabaseHandle instanceof Error) {
            return fill();
          }
          self.mongoDatabaseHandle.collection(self.mongoCollection).find(self.mongoQuery, self.mongoOptions).sort(self.mongoSort).skip(self.parameters.startIndex).limit(self.parameters.itemsPerPage).toArray().then(func).catch(fill);
      })
      .apply(req)
      .then(function(locals) {
          if (locals.mongoDatabaseHandle) {
            locals.mongoDatabaseHandle.close()
            delete locals.mongoDatabaseHandle;
          }
          if (locals.parameters === false) {
            return res.status(400).send('Bad Request').end();
          }
          res.set(locals.headers);
          rdr.run(res, locals, next);
      })
      .catch(next);

  });



  router.route('/-/v2/browse.:format')
  .get(function (req, res, next) {

      var rdr = new Render()
        , flyopts = {
            "connexionURI" : config.get('connexionURI'),
            "collectionName": config.get('collectionName'),
            "concurrency" : config.get('concurrency')
          }
        , fly = new Flying(config.get('flyingFields'), flyopts)
        ;

      datamodel()
      .declare('mongoDatabaseHandle', function(req, fill) {
          MongoClient.connect(req.config.get('connexionURI')).then(fill).catch(fill);
      })
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
            },
            "firstOnly" : {
              "alias": ["fo"],
              "type" : "boolean",
              "required" : false
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
          if (this.mongoDatabaseHandle instanceof Error) {
            return fill();
          }
          this.mongoDatabaseHandle.collection(this.mongoCollection).find(this.selector).count().then(fill).catch(fill);
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
          if (this.mongoDatabaseHandle instanceof Error) {
            return fill();
          }
          this.mongoDatabaseHandle.collection(this.mongoCollection).find(this.mongoQuery, this.mongoOptions).count().then(fill).catch(fill);
      })
      .complete('data', function(req, fill) {
          var self = this;
          if (self.parameters === false) {
            return fill({});
          }
          var func = fill;
          if (self.parameters.flying) {
            func = function(r) {
              fly.affix(self.parameters.flying, self.parameters.firstOnly && Array.isArray(r) ? r[0] : r, fill);
            };
          }
          else {
            func = function(r) {
              fill(self.parameters.firstOnly && Array.isArray(r) ? r[0] : r);
            }
          }
          if (this.mongoDatabaseHandle instanceof Error) {
            return fill();
          }
          self.mongoDatabaseHandle.collection(this.mongoCollection).find(self.mongoQuery, self.mongoOptions).sort(self.mongoSort).skip(self.parameters.startIndex).limit(self.parameters.itemsPerPage).toArray().then(func).catch(fill);
      })
      .apply(req)
      .then(function(locals) {
          if (locals.mongoDatabaseHandle) {
            locals.mongoDatabaseHandle.close()
            delete locals.mongoDatabaseHandle;
          }
          res.set(locals.headers);
          rdr.run(res, locals, next);
      })
      .catch(next);
  });


  router.route('/-/v2/display/:doc.:format')
  .get(function (req, res, next) {

      var rdr = new Render()
        , flyopts = {
            "connexionURI" : config.get('connexionURI'),
            "collectionName": config.get('collectionName'),
            "concurrency" : config.get('concurrency')
          }
        , fly = new Flying(config.get('flyingFields'), flyopts)
        ;

      datamodel()
      .declare('mongoDatabaseHandle', function(req, fill) {
          MongoClient.connect(req.config.get('connexionURI')).then(fill).catch(fill);
      })
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
      .prepend('mongoCollection', function(req, fill) {
          fill(this.parameters.resource);
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
          if (this.mongoDatabaseHandle instanceof Error) {
            return fill();
          }
          self.mongoDatabaseHandle.collection(self.mongoCollection, {strict:true}, function(err, coll) {
              if (err) {
                return fill(err);
              }
              coll.findOne(self.selector).then(func).catch(fill);
          });
      })
      .apply(req)
      .then(function(locals) {
          if (locals.mongoDatabaseHandle) {
            locals.mongoDatabaseHandle.close()
            delete locals.mongoDatabaseHandle;
          }
          res.set(locals.headers);
          rdr.run(res, locals, next);
      })
      .catch(next);
  });

  router.route('/-/v2/dump/:doc.:format')
  .get(function (req, res, next) {
      debug('id', req.params.doc);
      var id = req.params.doc
        , schema = {
            "xml" : {
              "transform" : {
                "type" : "text",
                "required" : false
              }
            },
            "json" : {
            }
          }
          ;

        if (!schema[req.params.format]) {
          return res.status(400).send('Bad Request').end();
        }

        var form = require('formatik').parse(req.query || {}, schema[req.params.format], 'fr');

        if (form.isValid()) {
          var selector = { wid : req.params.doc };

          MongoClient.connect(req.config.get('connexionURI')).then(function(db) {
              db.collection(req.config.get('collectionName'), {strict:true}, function(err, coll) {
                  if (err) {
                    return next(err);
                  }
                  coll.findOne(selector)
                  .then(function(o) {
                      res.set('Content-Type', require('../helpers/format.js')(req.params.format));
                      res.status(200);
                      res.send(o.content[req.params.format]);
                      res.end();
                  })
                  .catch(function(e) {
                      res.status(500).send('Internal Server Error').end();
                  });
              });
          }).catch(next);
        }
        else {
          res.status(400).send('Bad Request').end();
        }
    });

    router.route('/-/v2/save/:doc')
    .all(bodyParser.urlencoded({ extended: false }))
    .post(function (req, res, next) {
        var form = require('formatik').parse(req.body, {
            "key" : {
              "type" : "text",
              "required" : true,
              "pattern" : "[a-z][a-z0-9. _-]+"
            },
            "val" : {
              "type" : "text",
              "required" : true
            }
        }, 'fr');

        if (form.isValid()) {
          var data = {}
            , fields = form.mget('value')
            , selector = { wid : req.params.doc };

          data[fields.key] = fields.val;

          debug('save', selector, data);

          MongoClient.connect(req.config.get('connexionURI')).then(function(db) {
              db.collection(req.config.get('collectionName'), {strict:true}, function(err, coll) {
                  if (err) {
                    return next(err);
                  }
                  coll.update(selector, { $set : data })
                  .then(function() {
                      res.status(200).send('OK').end();
                  })
                  .catch(function() {
                      res.status(500).send('Internal Server Error').end();
                  });
                  res.status(200).send('OK').end();
              });
          }).catch(next);
        }
        else {
          res.status(400).send('Bad Request').end();
        }

    });

    router.route('/-/v2/drop/:doc')
    .all(bodyParser.urlencoded({ extended: false }))
    .post(function (req, res, next) {
        var form = require('formatik').parse(req.body, {
            "key" : {
              "type" : "text",
              "required" : true,
              "pattern" : "[a-z][a-z0-9. _-]+"
            }
        }, 'fr');

        if (form.isValid()) {
          var data = {}
            , fields = form.mget('value')
            , selector = { wid : req.params.doc };

          data[fields.key] = "";

          debug('drop', selector, data);

          MongoClient.connect(req.config.get('connexionURI')).then(function(db) {
              db.collection(req.config.get('collectionName'), {strict:true}, function(err, coll) {
                  if (err) {
                    return next(err);
                  }
                  coll.update(selector, { $unset : data })
                  .then(function() {
                      res.status(200).send('OK').end();
                  })
                  .catch(function() {
                      res.status(500).send('Internal Server Error').end();
                  });
                  res.status(200).send('OK').end();
              });
          }).catch(next);
        }
        else {
          res.status(400).send('Bad Request').end();
        }

    });

    router.route('/-/v2/corpus.:format')
    .get(function (req, res, next) {
        var
           rdr = new Render()
          , flyopts = {
              "connexionURI" : config.get('connexionURI'),
              "collectionName": config.get('collectionName'),
              "concurrency" : config.get('concurrency')
            }
          , fly = new Flying(config.get('flyingFields'), flyopts)
          ;


        datamodel()
        .declare('mongoDatabaseHandle', function(req, fill) {
            MongoClient.connect(req.config.get('connexionURI')).then(fill).catch(fill);
        })
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
              "firstOnly" : {
                "alias": ["fo"],
                "type" : "boolean",
                "required" : false
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
              fill(v);
            }
            else {
              fill(false);
            }
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
        .append('headers', function(req, fill) {
            var headers = {};
            headers['Content-Type'] = rdr.transpose(req.params.format);
            if (req.params.format === 'zip') {
              headers['Content-Disposition'] = 'attachment; filename="export.zip"';
            }
            else if (req.params.format === 'json') {
              headers['Access-Control-Allow-Origin']  = '*';
              headers['Access-Control-Allow-Headers'] = 'X-Requested-With'; // TODO: check it's useful
            }
            fill(headers);
        })
        .append('recordsTotal', function(req, fill) {
            if (this.parameters === false) {
              return fill(0);
            }
            this.mongoDatabaseHandle.collection(config.get('collectionName') + '_corpus').find(this.selector).count().then(fill).catch(fill);
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
        .complete('recordsFiltered', function(req, fill) {
            if (this.parameters === false) {
              return fill(0);
            }
            this.mongoDatabaseHandle.collection(config.get('collectionName') + '_corpus').find(this.mongoQuery, this.mongoOptions).count().then(fill).catch(fill);
        })
        .complete('data', function(req, fill) {
            var self = this;
            if (self.parameters === false) {
              return fill({});
            }
            if (self.parameters === false) {
              return fill({});
            }
            var func = fill;
            if (self.parameters.flying) {
              func = function(r) {
                fly.affix(self.parameters.flying, self.parameters.firstOnly && Array.isArray(r) ? r[0] : r, fill);
              }
            }
            else {
              func = function(r) {
                fill(self.parameters.firstOnly && Array.isArray(r) ? r[0] : r);
              }
            }
            this.mongoDatabaseHandle.collection(config.get('collectionName') + '_corpus').find(self.mongoQuery, self.mongoOptions).sort(self.mongoSort).skip(self.parameters.startIndex).limit(self.parameters.itemsPerPage).toArray().then(func).catch(fill);
        })
        .apply(req)
        .then(function(locals) {
            if (locals.mongoDatabaseHandle) {
              locals.mongoDatabaseHandle.close()
              delete locals.mongoDatabaseHandle;
            }
            if (locals.parameters === false) {
              return res.status(400).send('Bad Request').end();
            }
            res.set(locals.headers);
            rdr.run(res, locals, next);
        })
        .catch(next);
    })

    return router;
  }
