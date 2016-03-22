/* jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , crypto = require('crypto')
  , debug = require('debug')('castor:models:' + basename)
  , datamodel = require('datamodel')
  , MongoClient = require('mongodb').MongoClient
  , JSONStream = require('JSONStream')
  , es = require('event-stream')
  , EU = require('eu')
  , LRU = require('lru-cache')
  , JBJ = require('jbj')
  , CSV = require('csv-string')
  , Excel = require("exceljs")
  , async = require('async')
  , url = require('url')
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
  .append('firstOnly', function(req, fill) {
    if (req.query.fo || req.query.firstOnly) {
      fill(true);
    }
    else {
      fill(false);
    }
  })
  .complete('baseURI', function(req, fill) {
    var baseURL, prefixKEY;
    if (this.table._root === true) {
      prefixKEY = req.config.get('prefixKEY');
    }
    else {
      prefixKEY = this.table._wid;
    }
    if (prefixKEY === undefined || this.collectionName === req.config.get('collectionsIndexName')) {
      prefixKEY = '';
    }
    if (req.config.get('trustProxy')) {
      baseURL = 'http://' + req.hostname;
    }
    else {
      baseURL = String(req.config.get('baseURL')).replace(/\/+$/,'');
    }
    if (prefixKEY === '') {
      fill(baseURL);
    }
    else {
      fill(baseURL.concat('/').concat(prefixKEY));
    }
  })
  .send(function(res, next) {
    var self = this;

    if (self.mongoCounter) {
      res.set('ETag', String('W/').concat(crypto.createHash('md5').update(String(self.mongoCounter)).digest('base64').replace(/=+$/, '')));
    }
    res.set('Content-Type', self.mimeType);
    res.on('finish', function() {
      self.mongoDatabaseHandle.close();
    });
    if (self.mimeType === 'application/n-quads') {
      res.setHeader('Content-disposition', 'attachment; filename=' + this.fileName);
    }
    else if (self.mimeType === 'text/csv') {
      res.setHeader('Content-disposition', 'attachment; filename=' + this.fileName);
      res.write(CSV.stringify(Object.keys(self.table._columns).map(function(propertyName) {
        return self.table._columns[propertyName]['label'];
      })))
    }
    else if (self.mimeType === 'text/tab-separated-values') {
      res.setHeader('Content-disposition', 'attachment; filename=' + this.fileName);
      res.write(CSV.stringify(Object.keys(self.table._columns).map(function(propertyName) {
        return self.table._columns[propertyName]['label'];
      }), "\t"))
    }
    else if (self.mimeType === 'application/vnd.ms-excel') {
      res.setHeader('Content-disposition', 'attachment; filename=' + this.fileName);
      var workbook = new Excel.stream.xlsx.WorkbookWriter({
        stream: res
      });
      var worksheet = workbook.addWorksheet(self.table._label, "FFC0000");
      if (self.syntax === 'array') {
        worksheet.columns = Object.keys(self.table._columns).map(function(propertyName) {
          return { header: self.table._columns[propertyName]['label'], key: propertyName, width: 33};
        });
      }
    }

    //
    // Pipe Mongo cursor
    //
    var stream = this.mongoCursor.stream();
    var cursor = stream;
    var counter = 0;


    //
    // firstOnly && Add Table info
    //
    stream = stream
    .pipe(es.map(function (data, submit) {
      if (self.firstOnly && counter > 0) {
        cursor.close();
        submit();
      }
      else {
        data._table = self.table;
        submit(null, data);
      }
      ++counter;
    }))


    //
    // Compute column field with a title
    //
    stream = stream.pipe(es.map(function (data, submit) {
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
          else if (out !== null && typeof out === 'object' && out.___marker === true)  { // no transformation
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
    stream = stream.pipe(es.map(function (data, submit) {
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
      }));
      //
      // Transform document to JSON-LD
      //
      stream = stream.pipe(es.map(function (data, submit) {
        var doc = {}
        doc['@id'] = self.baseURI.concat("/").concat(data['_wid']);
        doc['@context'] = {}
        Object.keys(self.table._columns).forEach(function(propertyName, index) {
          var field = self.table._columns[propertyName];
          if (field.type === null || field.type === undefined || typeof field.type !== 'string') {
            delete field.type;
          }
          doc['@context'][propertyName] = {};
          if (field.scheme !== undefined) {
            doc['@context'][propertyName]['@id'] = field.scheme;
          }
          if (field.type !== undefined) {
            doc['@context'][propertyName]['@type'] = field.type;
          }
          if (field.language !== undefined) {
            doc['@context'][propertyName]['@language'] = field.language;
          }
          doc[propertyName] = data[propertyName] || null;
        });
        if (data._content === undefined) {
          data._content = {};
        }
        data._content.jsonld = doc;
        submit(null, data);
      }));
      //
      // Resolve Resource Link
      //
      stream = stream.pipe(es.map(function (data, submit) {
        var urls = [], keys = [], doc = data._content.jsonld;

        Object.keys(doc["@context"]).forEach(function(key) {
          if (doc["@context"][key]
            && typeof doc["@context"][key] === 'object'
            && doc["@context"][key]["@type"]
            && doc["@context"][key]["@type"] === "@id"
            && doc[key]
            && typeof doc[key] === 'string'
          ) {
            var urlObj = url.parse(doc[key]);
            if (urlObj.host !== null) {
              urlObj.pathname = urlObj.pathname.concat('/$');
              urls.push(url.format(urlObj));
            }
            else {
              urls.push(self.baseURI.concat('/').concat(urlObj.pathname).concat('/$'));
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
              doc['$'+keys[index]] = item;
            });
            submit(null, data);

          });
        }));

        //
        // Break pipe for RAW format
        //
        if (this.extension === 'raw') {
          return stream.pipe(es.map(function (data, submit) {
            Object.keys(data).filter(function(key) { return key[0] !== '_' }).forEach(function(key) { delete data[key] });
            delete data._id;
            data._uri = self.baseURI.concat("/").concat(data['_wid']);
            submit(null, data);
          })).pipe(JSONStream.stringify(self.firstOnly ? false : undefined)).pipe(res);
        }
        else {
          return stream.pipe(es.map(function (data, submit) {
            submit(null, data._content.jsonld);
          })).pipe(JSONStream.stringify(self.firstOnly ? false : undefined)).pipe(res);
        }





        /*
         if (self.mimeType === 'text/html') {
           var template =
           String('{% extends "page.html" %}')
           .concat("\n")
           .concat('{% block body %}')
           .concat("\n")
           .concat(self.table._template)
           .concat("\n")
           .concat('{% endblock %}');
           stream = stream.pipe(es.map(function (data, submit) {
             // data._  =  {
             // site: self.site,
             // user: self.user,
             // page: self.page,
             // parameters: self.parameters,
             // config: self.config,
             // url: self.url
             // }
             debug('context', data);
             res.renderString(template, data, submit);
           }))
         }
         else {
           stream = stream.pipe(this.outputing)
         }
         */

        if (self.mimeType === 'application/n-quads') {
          stream = stream.pipe(es.map(function (data, submit) {
            jsonld.toRDF(data, {format: 'application/nquads'}, function(err, out) {
              if (err) {
                console.error(err);
                submit(null, {});
              }
              else {
                submit(err, out);
              }
            });
          }))
        }
        else if (self.mimeType === 'text/csv') {
          stream = stream.pipe(es.map(function (data, submit) {
            submit(null, CSV.stringify(Object.keys(self.table._columns).map(function(propertyName) {
              return data[propertyName];
            })));
          }))
        }
        else if (self.mimeType === 'text/tab-separated-values') {
          stream = stream.pipe(es.map(function (data, submit) {
            submit(null, CSV.stringify(Object.keys(self.table._columns).map(function(propertyName) {
              return data[propertyName];
            }), "\t"));
          }))
        }
        else if (self.mimeType === 'application/vnd.ms-excel' && self.syntax === 'rdf') {
          stream = stream.pipe(es.map(function (data, submit) {
            jsonld.toRDF(data, {format: 'application/nquads'}, function(err, out) {
              if (err) {
                console.error(err);
                submit(null, {});
              }
              else {
                out.split('.\n').forEach(function(triplet) {
                  worksheet.addRow(CSV.parse(triplet.replace(" ", "@").replace(" ", "@"), "@").pop()).commit();
                });
                submit();
              }
            });
          }));
          stream.on("end", function() {
            worksheet.commit();
            workbook.commit();
          });
          return;
        }
        else if (self.mimeType === 'application/vnd.ms-excel' && self.syntax === 'array') {
          stream = stream.pipe(es.map(function (data, submit) {
            var row = {};
            Object.keys(self.table._columns).forEach(function(propertyName) {
              row[propertyName] = data[propertyName];
            });
            worksheet.addRow(row).commit();
            submit();
          }));
          stream.on("end", function() {
            worksheet.commit();
            workbook.commit();
          });
          return;
        }
        else if (self.firstOnly) {
          stream = stream.pipe(JSONStream.stringify(false));
        }
        else {
          stream = stream.pipe(JSONStream.stringify());
        }

        stream.pipe(res);
      });

      return model;
    }



