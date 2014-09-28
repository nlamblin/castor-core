'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:loaders:' + basename)
  , path = require('path')
  , fs = require('fs')
  , prettysize = require('prettysize')
  , mimetype = require('mimetype')
  , crypto = require('crypto')
  , shorthash = require('shorthash')
  , datamodel = require('datamodel')
  , extend = require('extend')
  ;

module.exports = function(config) {
  return datamodel()
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
  .append('text', function(file, fill) {
      fill(this.object);
  })
  .append('language', function(file, fill) {
      fill('none');
  })
  .append('content', function(file, fill) {
      var self = this;
      fill({});
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
  .takeout();
}
