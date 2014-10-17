/*jshint node:true*/
'use strict';

var objectPath = require('object-path');

module.exports = function(config) {
  return function(object, path) {
    return objectPath.get(object, path);
  };
};
