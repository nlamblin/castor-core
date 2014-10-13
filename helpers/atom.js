'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:helpers:' + basename)
  , util = require('util')
  , XMLWriter = require('xml-writer')
  , ATOMWriter = require('atom-writer')
  ;

module.exports = function (input) {

  var title = '';
  title += input.page && input.page.title ? input.page.title : '';
  title += input.site && input.site.title ? ' | ' + input.site.title : '';

  var xw = new XMLWriter(true);

  var aw = new ATOMWriter(xw);

  var render = function() {
    return aw;
  }

  render.pipe = function(output) {
    output.send(xw.toString());
  }


  aw
  .startFeed('urn:castor:data')
  .writeTotalResults(input.data.length)
  .writeTitle(title)
  .writeLink(input.url.href.toString(), 'application/atom+xml', 'self')

  input.data.forEach(function (item, index) {
      aw
      .startEntry('urn:dotecase:file-' + item.uid, item.dateModified, item.dateCreated)
      .writeTitle(item.object.toString())
      .writeLink(input.url.protocol + '//' + input.url.host + '/display/' + item.wid + '.html');
      if (item.description) {
        aw.writeContent(item.description.toString(), 'text')
      }
      // .writeAuthor('Tata Toto', 'toto@exemple.com')
      if (item.subject) {
        aw.writeCategory(item.subject.toString(), 'subject')
      }
      if (item.category) {
        aw.writeCategory(item.category.toString(), 'category')
      }
      aw.endEntry()
    }
  )
  aw.endFeed();

  return render;
}
