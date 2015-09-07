/*jshint node:true, laxcomma:true*/
'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , path = require('path')
  , JBJ = require('jbj')
  , objectPath = require('object-path')
  ;

// WARNING: this seems to be overriden by lib/compute.js
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
  urlObj.port = self.options.port;
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




JBJ.register('local:', local);
JBJ.register('http:', request);
JBJ.register('https:', request);


module.exports = function(options) {
  options = options || {};
  options.stylesheet = options.stylesheet ? options.stylesheet : {};

  if (typeof options.stylesheet !== 'object') {
    options.stylesheet = {};
  }
  return function (input, submit) {
    JBJ.render(options.stylesheet, input, function (err, res) {
      if (err) {
        return submit(err);
      }
      for (var field in options.stylesheet) {
        // Remove all nosave documentFields
        if (options.stylesheet[field].nosave) {
          field = field.slice(1);
          objectPath.del(res,field);
        }
        // Truncate all indexed documentFields
        else if (!options.stylesheet[field].noindex) {
          field = field.slice(1);
          var value = objectPath.get(res, field);
          if (field !== 'text' && typeof value === 'string') {
            objectPath.set(res,field,value.slice(0,999));
          }
        }
      }
      submit(err, res);
    });
  };
};
