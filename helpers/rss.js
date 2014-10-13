'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:helpers:' + basename)
  , util = require('util')
  , XMLWriter = require('xml-writer')
  ;

function pad(n) {
  return n < 10 ? '0' + n : n
}

function date2string(d) {
  return d.getUTCFullYear() + '-'
  + pad(d.getUTCMonth() + 1) + '-'
  + pad(d.getUTCDate()) + 'T'
  + pad(d.getUTCHours()) + ':'
  + pad(d.getUTCMinutes()) + ':'
  + pad(d.getUTCSeconds()) + 'Z'
}

module.exports = function (input) {

  var xw = new XMLWriter(true);

  var render = function() {
    return xw;
  }

  render.pipe = function(output) {
    output.send(xw.toString());
  }

  var title = '', description = '';
  title += input.page && input.page.title ? input.page.title : title;
  title += input.site && input.site.title ? ' | ' + input.site.title : '';
  description = input.page && input.page.description ? input.page.description : description;
  description = input.site && input.site.description ? input.site.description : description;

  xw.startDocument();
  xw.startElement('rss');
  xw.writeAttribute('version', '2.0');
  xw.startElement('channel');
  xw.writeElement('title', title);
  xw.writeElement('description', description);
  xw.writeElement('lastBuildDate', date2string(new Date()));
  xw.writeElement('link', input.url.href);
  input.data.forEach(function (item, index) {
      xw.startElement('item');
      xw.writeElement('title', item.object.toString());
      if (item.description) {
        xw.writeElement('description', item.description.toString());
      }
      xw.writeElement('lastBuildDate', date2string(item.dateModified));
      xw.writeElement('link', input.url.protocol + '//' + input.url.host  + '/display/' + item.wid + '.html');
      xw.endElement();
    }
  );
  xw.endElement();
  xw.endElement();
  xw.endDocument();

  return render;

}
