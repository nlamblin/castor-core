/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  ;


module.exports = function(model) {
  model
  .declare('indexDescription', function(req, fill) {
    var index = {
      // @todo Idéalement il faudrait inserer ce document avec castor-load
      "fid": "index",       // pour être compatible castor-load
      "number": 0,          // pour être compatible castor-load
      "state": "inserted",  // pour être compatible castor-load
      "_wid": "index",
      "_label": req.config.get('title'),
      "_text": req.config.get('description'),
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
    };
    fill(index);
  })
  .declare('hotfolderDescription', function(req, fill) {
    var index;
    if (req.config.has('dataPath')) {
      index = {
        // @todo Idéalement il faudrait inserer ce document avec castor-load
        "fid": req.config.get('collectionName'),       // pour être compatible castor-load
        "number": 0,          // pour être compatible castor-load
        "state": "inserted",  // pour être compatible castor-load
        "_wid": req.config.get('collectionName'),
        "_label": "Hotfolder",
        "_text": "The hot folder is continuously monitored, and when files are copied or dropped into it, they are automatically processed",
        "_hash": null,
        "_template": null,
        "_root": false,
        "_columns" : {
          "uri" : {
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
          }
        }
      };
    }
    fill(index);
  })
  .prepend('initState', function(req, fill) {
    var self = this;
    if (self.mongoDatabaseHandle instanceof Error) {
      return fill();
    }
    self.mongoDatabaseHandle.collectionsIndex( {strict:true}, function(err, coll) {
      if (err) {
        self.mongoDatabaseHandle.collectionsIndex( function(err, newcoll) {
          newcoll.insertMany([self.indexDescription, self.hotfolderDescription]).then(function() {
            self.mongoDatabaseHandle.createIndex(req.config.get('collectionsIndexName'),
              {_wid:1},
              {unique:true, background:false, w:1}
            ).then(function() {
              fill(true);
            }).catch(fill);
          }).catch(fill);
        });
      }
      else {
        fill(false);
      }
    });
  })

  return model;
}

