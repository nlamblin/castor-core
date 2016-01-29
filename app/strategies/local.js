'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , sha1 = require('sha1')
  , Strategy = require('passport-local').Strategy
  ;


module.exports = function(options, core) {
  options = options || {};
  options.accessList = options.accessList || options.access || core.config.get('access') || [];

  if (Array.isArray(options.accessList) === false) {
    options.accessList = [options.accessList];
  }

  var Access = {};

  Access.findById = function(id, cb) {
    process.nextTick(function() {
        var idx = id - 1;
        if (options.accessList[idx]) {
          cb(null, options.accessList[idx]);
        } else {
          cb(new Error('User ' + id + ' does not exist'));
        }
    });
  }

  Access.findByUsername = function(username, cb) {
    process.nextTick(function() {
        for (var i = 0, len = options.accessList.length; i < len; i++) {
          var record = options.accessList[i];
          record.id = i + 1;
          if (record.login === username) {
            return cb(null, record);
          }
        }
        return cb(null, null);
    });
  }

  return new Strategy(options,
    function(username, password, cb) {
      Access.findByUsername(username, function(err, user) {
          if (err) { return cb(err); }
          if (!user) { return cb(null, false); }
           if (user.plain && user.plain !== password) {
             return cb(null, false);
           }
           if (user.sha1 && user.sha1 !== sha1(password)) {
             return cb(null, false);
           }
           if (user.password && user.password != password) {
             return cb(null, false);
           }
          return cb(null, user);
      });
  })
}
