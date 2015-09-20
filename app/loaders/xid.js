'use strict';
var shorthash = require('shorthash');
var farmhash = require('farmhash');
var checkdigit = require('checkdigit');

module.exports = function(options) {
  options = options || {};
  return function (input, submit) {
    input.wid = shorthash.unique(input.fid + input.number);
    var h = checkdigit.mod10.apply("0" + String(farmhash.hash32WithSeed(input.fid, input.number || 0)));
    input.nid = h.slice(0, 4) + "-" + h.slice(4, 8) + "-" + h.slice(8);
    submit(null, input);
  }
}
