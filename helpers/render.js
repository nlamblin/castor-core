'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:helpers:' + basename)
  , util = require('util')
  ;

module.exports = function(res, locals, next) {
  var render = locals.headers['Content-Type'];
  if (!render) {
    next(new Error('No render for ' + locals.headers['Content-Type']));
  }
  else if (locals.page.types.indexOf(render) === -1) {
    next();
  }
  else if (render === 'text/html') {
    res.render(locals.template || 'no template !', locals);
  }
  else if (render === 'application/json') {
    require('./json.js')(locals).pipe(res);
  }
  else if (render === 'application/atom+xml') {
    require('./atom.js')(locals).pipe(res);
  }
  else if (render === 'application/rss+xml') {
    require('./rss.js')(locals).pipe(res);
  }
  else if (render === 'application/zip') {
    require('./zip.js')(locals).pipe(res);
  }
  else if (render === 'text/csv') {
    require('./csv.js')(locals).pipe(res);
  }
  else {
    next();
  }
}
