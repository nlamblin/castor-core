/* jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , datamodel = require('datamodel')
  , MongoClient = require('mongodb').MongoClient
  , JSONStream = require('JSONStream')
  , es = require('event-stream')
  , EU = require('eu')
  , LRU = require('lru-cache')
  , JBJ = require('jbj')
  , CSV = require('csv-string')
  , async = require('async')
  , url = require('url')
  , Errors = require('../helpers/errors.js')
  , jsonld = require('jsonld')
  ;

module.exports = function(model) {
  var store = new EU.MemoryStore(new LRU())
    , cache = new EU.Cache(store)
    , agent = new EU(cache);

  model
  .declare('documentName', function(req, fill) {
      fill(req.routeParams.documentName);
  })
  .declare('extension', function(req, fill) {
      if (req.query.alt) {
        fill(req.query.alt);
      }
      else {
        fill('json')
      }
  })
  .append('mimeType', function(req, fill) {
      if (this.extension === 'nq') {
        fill('application/n-quads');
      }
      else if (this.extension === 'csv') {
        fill('text/csv');
      }
      else if (this.extension === 'raw') {
        fill('application/json');
      }
      else {
        fill('application/json');
      }
  })
  .append('fileName', function(req, fill) {
      var d = new Date()
      var s = d.toJSON().substring(0, 10).concat('-').concat(req.routeParams.resourceName);
      if (this.documentName) {
        s = s.concat('.').concat(this.documentName)
      }
      fill(s.concat('.').concat(this.extension));
  })
  .complete('outputing', function(req, fill) {
      var self = this;
      if (self.extension === 'nq') {
        fill(es.map(function (data, submit) {
              jsonld.toRDF(data, {format: 'application/nquads'}, submit);
        }))
      }
      else if (self.extension === 'csv') {
        fill(es.map(function (data, submit) {
              submit(null, CSV.stringify(Object.keys(self.table._columns).map(function(propertyName) {
                      return data[propertyName];
              })));
        }))
      }
      else {
        fill(JSONStream.stringify());
      }
  })
  .declare('baseURL', function(req, fill) {
      fill(String(req.config.get('baseURL')).replace(/\/+$/,''));
  })
  .send(function(res, next) {
      var self = this;
      res.set('Content-Type', this.mimeType);
      res.on('finish', function() {
          self.mongoDatabaseHandle.close();
      });
      if (this.mimeType !== 'application/json') {
        res.setHeader('Content-disposition', 'attachment; filename=' + this.fileName);
      }
      if (this.mimeType === 'text/csv') {
        res.write(CSV.stringify(Object.keys(self.table._columns).map(function(propertyName) {
                return propertyName;
        })))
      }

      //
      // Pipe Mongo cursor
      //
      var stream = this.mongoCursor.stream();
      debug(this.extension, this.documentName)
      if (this.extension === 'raw' && this.documentName) {
        return stream.pipe(this.outputing).pipe(res);
      }
      debug('_columns', self.table._columns);
      stream
      //
      // Compute column field with a title
      //
      .pipe(es.map(function (data, submit) {
            var titleFields =  Object.keys(self.table._columns).filter(function(propertyName) {
                return self.table._columns[propertyName].title !== undefined && self.table._columns[propertyName].title !== null && typeof self.table._columns[propertyName].title === 'object'
            });
            async.map(titleFields, function(propertyName, callback) {
                var field = self.table._columns[propertyName]
                data['___marker'] = true;
                JBJ.render(field.title, data, function(err, out) {
                    if (err) {
                      callback(err);
                    }
                    else if (typeof out === 'object' && out.___marker === true)  { // no transformation
                      callback(err, undefined);
                    }
                    else {
                      callback(err, out);
                    }
                });
              }
            , function(err, results) {
                if (err) {
                  return submit(err);
                }
                titleFields.forEach(function(propertyName, index) {
                    if (results[index] !== undefined) {
                      data['$' + propertyName] = results[index];
                    }
                });
                submit(null, data);
            });
      }))
      //
      // Transform field with JBJ
      //
      .pipe(es.map(function (data, submit) {
            data['___marker'] = true;
            async.map(Object.keys(self.table._columns)
            , function(propertyName, callback) {
                var field = self.table._columns[propertyName];
                if (typeof field === 'object') {
                  JBJ.render(field, data, function(err, out) {
                      if (err) {
                        callback(err);
                      }
                      else if (typeof out === 'object' && out.___marker === true)  { // no transformation
                        callback(err, undefined);
                      }
                      else {
                        callback(err, out);
                      }
                  });
                }
                else {
                  callback(null, undefined);
                }
              }
            , function(err, results) {
                if (err) {
                  return submit(err);
                }
                Object.keys(self.table._columns).forEach(function(propertyName, index) {
                    if (results[index] !== undefined) {
                      data[propertyName] = results[index];
                    }
                });
                submit(null, data);
            });
      }))
      //
      // Transform document to JSON-LD
      //
      .pipe(es.map(function (data, submit) {
            var doc = {}
            doc['@id'] = self.baseURL.concat("/").concat(data['_wid']);
            doc['@context'] = {}
            Object.keys(self.table._columns).forEach(function(propertyName, index) {
                var field = self.table._columns[propertyName];
                doc['@context'][propertyName] = {};
                if (field.scheme !== undefined) {
                  doc['@context'][propertyName]['@id'] = field.scheme;
                }
                if (field.type !== undefined) {
                  doc['@context'][propertyName]['@type'] = field.type;
                }
                if (field.title !== undefined) {
                  doc['$' + propertyName] = data['$' + propertyName];
                }
                doc[propertyName] = data[propertyName] || null;
            });
            submit(null, doc);
      }))
      //
      // Resolve Resource Link
      //
      .pipe(es.map(function (data, submit) {
            var urls = [], keys = [];
            Object.keys(data["@context"]).forEach(function(key) {
                if (data["@context"][key]
                  && typeof data["@context"][key] === 'object'
                  && data["@context"][key]["@type"]
                  && data["@context"][key]["@type"] === "@id"
                  && data[key]
                  && typeof data[key] === 'string'
                ) {
                  var urlObj = url.parse(data[key]);
                  if (urlObj.host !== null) {
                    urlObj.pathname = urlObj.pathname.concat('/$');
                    urls.push(url.format(urlObj));
                  }
                  else {
                    urls.push(self.baseURL.concat(urlObj.pathname).concat('/$'));
                  }
                  keys.push(key);
                }
            });
            async.map(urls
            , function(urlStr, callback) {
                agent.get(urlStr, {json: true}, function(error, response, body) {
                    if (response && response.statusCode !== 200) {
                      body = undefined;
                    }
                    callback(error, body);
                });
              }
            , function(err, results) {
                if (err) {
                  return submit(err);
                }
                results.forEach(function(item, index) {
                    data['$'+keys[index]] = item;
                });
                submit(null, data)
            });
      }))
      .pipe(this.outputing)
      .pipe(res);
  });

  return model;
}



