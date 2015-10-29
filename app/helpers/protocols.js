'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:helpers:' + basename)
  , util = require('util')
  ;





module.exports = function (protocol, config) {

  function request(urlObj, callback) {
    var options = {
      url: urlObj
    };
    if (urlObj.hostname === '127.0.0.1' || urlObj.hostname === 'localhost') {
      options.proxy = null;
    }
    require('request')(options, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          callback(null, body);
        }
        else {
          console.log("err", error, response);
          callback(new Error('Request failed'));
        }
    });
  }

  function local(urlObj, callback) {
    urlObj.protocol = 'http:';
    urlObj.host = '127.0.0.1';
    urlObj.port = config.get('port');
    var buf = '', req = require('http').get(urlObj, function(res) {
        if (res.statusCode !== 200) {
          return callback(new Error('HTTP Error ' + res.statusCode));
        }
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            buf += chunk.toString();
        });
        res.on('error', callback);
        res.on('end', function() {
            callback(null, buf);
        });
    });
    req.on('error', callback);
  }

  if (protocol === 'http') {
    return request;
  }
  else if (protocol === 'https') {
    return request;
  }
  else if (protocol === 'local') {
    return local;
  }
  else {
    return local;
  }

}
