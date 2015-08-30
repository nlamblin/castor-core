/* jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , datamodel = require('datamodel')
  , MongoClient = require('mongodb').MongoClient
  , JSONStream = require('JSONStream')
  , es = require('event-stream')
  , EU = require('eu')
  , LRU = require('lru-cache')
  , JBJ = require('jbj')
  , CSV = require('csv-string')
  , async = require('async')
  , url =require('url')
  , Errors = require('../errors.js')
  ,  jsonld = require('jsonld')
  ;

module.exports = function(model) {
  var store = new EU.MemoryStore(new LRU())
    , cache = new EU.Cache(store)
    , agent = new EU(cache);

  model
  .declare('collectionName', function(req, fill) {
      if (req.routeParams.resourceName === 'index') {
        fill(req.config.get('collectionsIndexName'))
      }
      else {
        fill(req.routeParams.resourceName);
      }
  })
  .declare('contentType', function(req, fill) {
      if (req.query.alt === 'nquads') {
        fill('text/plain');
      }
      else if (req.query.alt === 'csv') {
        fill('text/plain');
      }
      else {
        fill('application/json');
      }
  })
  .append('outputing', function(req, fill) {
      if (req.query.alt === 'nquads') {
        fill(es.map(function (data, submit) {
              jsonld.toRDF(data, {format: 'application/nquads'}, submit);
        }))
      }
      else if (req.query.alt === 'csv') {
        var c = 0;
        fill(es.map(function (data, submit) {
              c++;
              /*
              if( c === 1) {
                submit(null,  CSV.stringify(['a', 'n'] + "\n" + CSV.stringify(['b', 'm'])))
              }
              else
                */
              {
                delete data['@context'];
                submit(null, CSV.stringify(data));
              }
        }))
      }
      else {
        fill(JSONStream.stringify());
      }
  })
  .declare('baseURL', function(req, fill) {
      fill(String(req.config.get('baseURL')).replace(/\/+$/,''));
  })
 .append('mongoCursor', function(req, fill) {
      if (this.mongoDatabaseHandle instanceof Error) {
        return fill();
      }
      fill(this.mongoDatabaseHandle.collection(this.collectionName).find(this.mongoQuery));
  })
  .send(function(res, next) {
      var self = this;
      res.set('Content-Type', this.contentType);
      res.on('finish', function() {
          self.mongoDatabaseHandle.close();
      });
      this.mongoCursor.stream()
      //
      // Compute field with propertyText
      //
      .pipe(es.map(function (data, submit) {
            async.map(self.table._columns
            , function(field, callback) {
                if (field.propertyText === undefined) {
                  callback(null, null);
                }
                else if (field.propertyText !== null && typeof field.propertyText === 'object') {
                  JBJ.render(field.propertyText, data, callback);
                }
                else {
                  callback(null, field.propertyText);
                }
              }
            , function(err, results) {
                if (err) {
                  return submit(err);
                }
                self.table._columns.forEach(function(item, index) {
                    data['$' + item.propertyName] = results[index];
                });
                submit(null, data);
            });
      }))
      //
      // Compute field with propertyValue
      //
      .pipe(es.map(function (data, submit) {
            async.map(self.table._columns
            , function(field, callback) {
                if (field.propertyValue === undefined) {
                  callback(null, null);
                }
                else if (field.propertyValue !== undefined && field.propertyValue !== null && typeof field.propertyValue === 'object') {
                  JBJ.render(field.propertyValue, data, callback);
                }
                else {
                  callback(null, field.propertyValue);
                }
              }
            , function(err, results) {
                if (err) {
                  return submit(err);
                }
                self.table._columns.forEach(function(item, index) {
                    data[item.propertyName] = results[index];
                });
                submit(null, data);
            });
      }))
      //
      // Transform document to standard
      //
      .pipe(es.map(function (data, submit) {
            var doc = {}
            doc['@id'] = self.baseURL.concat("/").concat(data['_name']);
            doc['@context'] = {}
            self.table._columns.forEach(function(item, index) {
                doc['@context'][item.propertyName] = {};
                doc['@context'][item.propertyName]['@id'] = item.propertyScheme;
                if (item.propertyType) {
                  doc['@context'][item.propertyName]['@type'] = item.propertyType;
                }
                if (item.propertyText) {
                  doc['$' + item.propertyName] = data['$' + item.propertyName];
                }
                if (item.propertyValue) {
                  doc[item.propertyName] = data[item.propertyName];
                }
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



