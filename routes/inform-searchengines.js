'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , util = require('util')
  , datamodel = require('datamodel')
  , pmongo = require('promised-mongo')
  , XMLWriter = require('xml-writer')
  ;

module.exports = function(config) {
  var coll = pmongo(config.get('connexionURI')).collection(config.get('collectionName'));
  return datamodel()
  .declare('config', function(req, fill) {
      fill(config.get());
  })
  .declare('url', function(req, fill) {
      fill(require('url').parse(req.protocol + '://' + req.get('host') + req.originalUrl));
  })
  .append('items', function(req, fill) {
      coll.find().toArray().then(fill).catch(fill);
  })
  .send(function(res, next) {
      var self = this;




      var xw = new XMLWriter(true);
      xw.startDocument('1.0', 'UTF-8');
      xw.startPI('xml-stylesheet');
      xw.writeAttribute('type', 'text/xsl');
      xw.writeAttribute('href', self.url.protocol + '//' + self.url.host + '/assets/sitemap.xsl');

      xw.endPI();
      xw.startElement('urlset');
      xw.writeAttribute('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');
      // xw.writeAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
      // xw.writeAttribute('xsi:schemaLocation', 'http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd');
      self.items.forEach(function (item, index) {
          xw.startElement('url');

          xw.startElement('loc');
          xw.text(self.url.protocol + '//' + self.url.host + '/-/v0/files/' + item.uid + '/download');
          xw.endElement();

          xw.startElement('lastmod');
          xw.text(String(item.dateModified));
          xw.endElement();

          xw.startElement('changefreq');
          xw.text(String(item.changefreq || 'monthly'));
          xw.endElement();

          xw.startElement('priority');
          xw.text(String(item.priority || '0.8'));
          xw.endElement();

          xw.endElement();
        }
      );
      xw.endElement();
      xw.endDocument();

      res.type('text/xml');
      res.send(xw.toString());
    }
  )
  .takeout();
}
