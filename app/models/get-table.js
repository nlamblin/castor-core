/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  ;

module.exports = function(model) {
  model
    .declare('defaultDescription', function(req, fill) {
    fill({
      "fid": "__change__me__",       // pour être compatible castor-load
      "number": 0,          // pour être compatible castor-load
      "state": "inserted",  // pour être compatible castor-load
      "_wid": "__change__me__",
      "_label": 'Default Description',
      "_text": "This is the default description for all tables that are not registered in the index.",
      "_hash": null,
      "_template": null,
      "_root": true,
      "_columns" : {
        "_wid" : {
          //
          // Mandatory Column for the reduce system
          //
          "label" : "URI",
          "scheme": "https://www.w3.org/ns/rdfa#uri",
          "comment" : "A mandatory column for \"dollar\" URLs",
          "title" : {
            "get" : "_label"
          }
        },
        "title" : {
          "label" : "Title",
          "scheme": "https://schema.org/title",
          "type": "https://www.w3.org/TR/xmlschema-2/#string",
          "get": "_label"
        },
        "description" : {
          "label" : "Description",
          "scheme": "https://schema.org/description",
          "type": "https://www.w3.org/TR/xmlschema-2/#string",
          "get": "_text"
        },
        "url" : {
          "label" : "URL",
          "scheme": "http://schema.org/url",
          "type": "http://www.w3.org/TR/xmlschema-2/#anyURI",
          "get": ["baseURL", "_wid"],
          "join": "/"
          // "title": {
          // "get" : "_wid"
          // }
        }
      }
    });
  })
  .append('table', function(req, fill) {
      var Errors = req.core.Errors;
      var self = this;
      if (self.mongoDatabaseHandle instanceof Error) {
        return fill();
      }
      self.mongoDatabaseHandle.collectionsIndex().findOne({
          "_wid" : req.routeParams.resourceName
      }).then(function(doc) {
          if (doc === null && req.routeParams.resourceName === 'index') {
            self.mongoDatabaseHandle.collectionsIndex().insertOne(self.indexDescription).then(function() {
                fill(self.indexDescription);
            }).catch(fill);
          }
          else if (doc === null) {
            self.defaultDescription.fid = req.routeParams.resourceName;
            self.defaultDescription._wid = req.routeParams.resourceName;
            self.defaultDescription._label = 'Table ' + req.routeParams.resourceName;
            fill(self.defaultDescription);
          }
          else if (doc._columns === undefined) {
            doc._columns = []
            fill(doc);
          }
          else {
            fill(doc);
          }
      }).catch(fill);
  })
  .complete('table', function(req, fill) {
      var self = this;
      if (req.routeParams.resourceName === 'index') {
        self._index = true;
      }
      Object.keys(self.table).filter(function(key) { return key[0] !== '_' }).forEach(function(key) { delete self.table[key] });
      delete self.table._id;
      fill(self.table);
  })



  return model;
}



