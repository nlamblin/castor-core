'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:middlewares:' + basename)
  , path = require('path')
  , fs = require('fs')
  , prettysize = require('prettysize')
  , mimetype = require('mimetype')
  , crypto = require('crypto')
  , shorthash = require('shorthash')
  , datamodel = require('datamodel')
  , config  = require('../config.js')
  , extend = require('extend')
  , jsel = require('jsel')
  ;

datamodel()
.declare('wid', function(file, fill) {
    fill(shorthash.unique(file.fid));
})
.declare('contentSize', function(file, fill) {
    fill(prettysize(file.filesize));
})
.declare('date', function(file, fill) {
    var ct = new Date(file.dateModified);
    fill({
        year : Number(ct.getFullYear()),
        month : Number(ct.getMonth()),
        day : Number(ct.getDate())
    });
})
.declare('mimetype', function(file, fill) {
    fill(mimetype.lookup(file.location) || undefined);
})
.declare('object', function(file, fill) {
    fill(path.basename(file.location, path.extname(file.location)).replace(/[\_\-\.]+/g, ' '));
})
.declare('subject', function(file, fill) {
    fill(path.basename(file.dirname));
})
.declare('starred', function(file, fill) {
    fill(false);
})
.declare('seo', function(file, fill) {
    fill({
        priority : "0.8",
        changefreq : "monthly"
    });
})

.append('language', function(file, fill) {
    fill('none');
})
.append('@content', function(file, fill) {
    var self = this;
    fill({});
    /*
     fs.readFile(file.location, function (err, data) {
         if (err) {
           return fill(err);
         }
         var c = {};
         if (self.mimetype) {
           c[self.mimetype] = data.toString();
         }
         fill(c);
       }
     );
     */
})
.complete('@userfields', function(file, fill) {
    var self = this,
        values = {},
        fields = config.get('userfields'),
        dom = jsel(self);
    if (typeof fields === 'object') {
      Object.keys(fields).forEach(function (key) {
          var xpr = fields[key];
          var val = typeof xpr === 'string' && xpr !== '' ? dom.selectAll(xpr) : undefined;
          debug(xpr, val);
          if (Array.isArray(val)) {
            if (val.length === 0) {
              values[key] = undefined;
            }
            else if (val.length === 1) {
              values[key] = val.pop();
            }
            else {
              values[key] = val;
            }
          }
          else {
            values[key] = undefined;
          }
        }
      );
    }
    fill(values);
})
.transform(function(file, fill) {
    var doc = this;
    extend(doc, file);
    fill(doc);
})
.send(function(res, next) {
    next(undefined, this);
  }
)
.attach(module);
