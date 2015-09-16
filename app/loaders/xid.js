'use strict';
var shorthash = require('shorthash');
var farmhash = require('farmhash');
var checkdigit = require('checkdigit');

module.exports = function(options) {
  options = options || {};
  options.prefix = options.prefix || "XX";
  return function (input, submit) {
    input.wid = shorthash.unique(input.fid + input.number);
    var h = String(farmhash.hash32WithSeed(input.fid, input.number || 0));
    input.pid = options.prefix.substring(0, 2) + h.slice(0, 2) + "-" + h.slice(2,6) + "-" + h.slice(6);
    submit(null, input);
  }
}
