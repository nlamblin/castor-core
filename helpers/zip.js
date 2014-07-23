'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:helpers:' + basename)
  , util = require('util')
  , archiver = require('archiver')
  ;

module.exports = function (input) {

  var archive = archiver('zip');

  var render = function() {
    return archive;
  }

  render.pipe = function(output) {
    archive.pipe(output);
    input.items.forEach(function (item) {
        if (item.state !== 'deleted') {
          archive.file(item.location,  { name: item.name });
        }
      }
    );
    archive.finalize();
  }

  return render;

}
