/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:models:' + basename)
  , mqs = require('mongodb-querystring')
  ;


module.exports = function(model) {
  model
  .declare('query', function(req, fill) {
    fill(mqs.create(req.query));
  })
  .declare('syntax', function(req, fill) {
    if (req.query.alt === undefined || req.config.get('allowedAltValues').indexOf(req.query.alt) === -1) {
      req.query.alt = 'min';
    }
    if (req.query.alt === 'xls') {
      fill('xlsx');
    }
    else if (req.query.alt === 'json') {
      fill('raw');
    }
    else if (req.query.alt === 'dry') {
      fill('jbj');
    }
    else if (req.query.alt === 'min') {
      fill('jbj');
    }
    else if (req.query.alt) {
      fill(req.query.alt);
    }
    else {
      fill('jbj');
    }
  })
  .declare('extension', function(req, fill) {
    if (req.query.alt === undefined || req.config.get('allowedAltValues').indexOf(req.query.alt) === -1) {
      req.query.alt = 'min';
    }
    if (req.query.alt === 'nq.xlsx') {
      fill('xlsx');
    }
    else if (req.query.alt === 'dry') {
      fill('json');
    }
    else if (req.query.alt === 'jbj') {
      fill('json');
    }
    else if (req.query.alt) {
      fill(req.query.alt);
    }
    else {
      fill('json')
    }
  })
  .declare('mimeType', function(req, fill) {
    if (req.query.alt === undefined || req.config.get('allowedAltValues').indexOf(req.query.alt) === -1) {
      req.query.alt = 'min';
    }
    if (req.query.alt === 'jbj') {
      fill('application/json');
    }
    else if (req.query.alt === 'dry') {
      fill('application/json');
    }
    else if (req.query.alt === 'raw') {
      fill('application/json');
    }
    else if (req.query.alt === 'json') {
      fill('application/json');
    }
    else if (req.query.alt === 'jsonld') {
      fill('application/json');
    }
    else if (req.query.alt === 'nq') {
      fill('application/n-quads');
    }
    else if (req.query.alt === 'csv') {
      fill('text/csv');
    }
    else if (req.query.alt === 'tsv') {
      fill('text/tab-separated-values');
    }
    else if (req.query.alt === 'xls' || req.query.alt === 'xlsx' || req.query.alt === 'nq.xlsx') {
      fill('application/vnd.ms-excel');
    }
    else if (req.query.alt === 'html') {
      fill('text/html');
    }
    else {
      fill('application/json');
    }
  })
  .prepend('stylesheet', function(req, fill) {
    debug('req.query.alt', req.query.alt, req.query.alt === 'min');
    if (req.query.alt === 'jbj') {
      fill(this.query.get('$transform', {}));
    }
    else if (req.query.alt === 'dry') {
      fill(req.config.get('driedFields'));
    }
    else if (req.query.alt === 'min') {
      fill({
        "$_id": {
          "get": "_wid"
        },
        "$value": {
          "get": req.config.get('valueSelectors'),
          "deduplicate" : true,
          "first": true,
          "default" : "n/a"
        },
        "mask": "_id,value"
      });
    }
    else {
      fill();
    }
  })
  .prepend('fileName', function(req, fill) {
    var d = new Date()
    var s = d.toJSON().substring(0, 10).concat('-').concat(req.routeParams.resourceName);
    if (this.documentName) {
      s = s.concat('.').concat(this.documentName)
    }
    if (req.query.alt === 'nq.xlsx') {
      s = s.concat('-nq')
    }
    fill(s.concat('.').concat(this.extension));
  })
  return model;
}

