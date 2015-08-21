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
  , async = require('async')
  , url =require('url')
  , Errors = require('../errors.js')
  ;

module.exports = function(model) {
  var store = new EU.MemoryStore(new LRU())
    , cache = new EU.Cache(store)
    , agent = new EU(cache);

  model
  .declare('collectionName', function(req, fill) {
      if (req.params.resourcename === 'index') {
        fill(req.config.get('collectionsIndexName'))
      }
      else {
        fill(req.params.resourcename);
      }
  })
  .declare('config', function(req, fill) {
      fill(req.config);
  })
  .prepend('mongoQuery', function(req, fill) {
      if (req.params.resourcename === 'index') {
        fill({ _name: { $ne: "index" } });
      }
      else {
        fill({});
      }
  })
  .append('mongoCursor', function(req, fill) {
      if (this.mongoDatabaseHandle instanceof Error) {
        return fill();
      }
      fill(this.mongoDatabaseHandle.collection(this.collectionName).find(this.mongoQuery));
  })
  .send(function(res, next) {
      var self = this;
      res.set('Content-Type', 'application/json');
      res.on('finish', function() {
          self.mongoDatabaseHandle.close();
      });
      this.mongoCursor.stream()
      .pipe(es.map(function (data, submit) {
            async.map(self.columns
            , function(field, callback) {
                if (field.propertyValue === undefined) {
                  callback(null, null);
                }
                else if (typeof field.propertyValue === 'object') {
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
                var doc = {}
                doc['@id'] = String(self.config.get('baseURL')).concat("/").concat(data['_name']);
                doc['@context'] = {}
                self.columns.forEach(function(item, index) {
                    doc[item.propertyName] = results[index];
                    doc['@context'][item.propertyName] = {};
                    doc['@context'][item.propertyName]['@id'] = item['@id'];
                    doc['@context'][item.propertyName]['@type'] = item['@type'] || undefined;
                });
                debug('doc', doc);
                submit(null, doc);
            });
      }))
      .pipe(es.map(function (data, submit) {
            var urls = [], keys = [];
            Object.keys(data["@context"]).forEach(function(key) {
                if (data["@context"][key] && typeof data["@context"][key] === 'object' && data["@context"][key]["@type"] && data["@context"][key]["@type"] === "@id") {
                  var urlObj = url.parse(data[key]);
                  urlObj.pathname = urlObj.pathname.concat('/$');
                  urls.push(url.format(urlObj));
                  keys.push(key);
                }
            });
            async.map(urls
            , function(urlStr, callback) {
                agent.get(urlStr, {json: true}, function(error, response, body) {
                    if (response.statusCode !== 200) {
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
      .pipe(JSONStream.stringify())
      .pipe(res);
  });

  return model;
}



