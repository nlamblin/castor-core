'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , Strategy = require('passport-local').Strategy
  ;


module.exports = function(options) {
  options = options || {};
  options.accessList = options.accessList || [];

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
          if (record.username === username) {
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
          if (user.password != password) { return cb(null, false); }
          return cb(null, user);
      });
  })
}
