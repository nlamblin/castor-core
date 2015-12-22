'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:helpers:' + basename)
  , extend = require('extend')
  , util = require('util')
  , url = require('url')
  , http = require('http')
  ;

module.exports = function(urlObjGlobal) {
  // @see https://nodejs.org/api/url.html#url_url_format_urlobj
  return function (urlObjLocal, callback) {
    var urlObj = {};
    extend (urlObj, urlObjGlobal, urlObjLocal);
    urlObj.protocol = 'http:';
    urlObj.hostname = '127.0.0.1';
    debug('recall', url.format(urlObj))
    try {
      var buf = '', req = http.get(url.format(urlObj), function(res) {
          if (res.statusCode !== 200) {
            return callback(new Error('HTTP Error ' + res.statusCode));
          }
          res.setEncoding('utf8');
          res.on('data', function (chunk) {
              buf += chunk.toString();
          });
          res.on('error', callback);
          res.on('end', function() {
              callback(null, JSON.parse(buf));
          });
      });
      req.on('error', callback);
    }
    catch(e) {
      callback(e);
    }
  }
}
