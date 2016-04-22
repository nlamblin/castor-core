/*jshint node:true,laxcomma:true*/
'use strict';
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:helpers:' + basename)
  , assert = require('assert')
  , util = require('util')
  , got = require('got')
  , qs = require('qs')
  , URL = require('url')
  ;

function Agent(port, options) {

  options = options || {};

  if (!(this instanceof Agent)) {
    return new Agent(port, options);
  }
  var self = this;
  self.options = options;
  self.port = port;
}

Agent.prototype.fix = function (url) {
  var target = URL.parse(url);
  target.protocol = 'http';
  target.slashes = true
  target.port = this.port;
  target.hostname =  '127.0.0.1';
  target.host = null;
  delete url.host;
  debug('url', URL.format(target))
  return URL.format(target);
}

Agent.prototype.get = function (url, options)
{
  debug('get', options)
  return got.get(this.fix(url), options)
}

Agent.prototype.post = function (url, options)
{
  if (typeof options.body === 'object') {
    options.body = qs.stringify(options.body);
    if (options.headers === undefined || typeof options.headers !== 'object') {
      options.headers = {}
    }
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.headers['Content-Length'] = options.body.length
  }
  debug('post', options)
  return got.post(this.fix(url), options)
}

Agent.prototype.head = function (url, options)
{
  return got.head(this.fix(url), options)
}

Agent.prototype.patch = function (url, options)
{
  return got.patch(this.fix(url), options)
}

Agent.prototype.delete = function (url, options)
{
  return got.delete(this.fix(url), options)
}

Agent.prototype.put = function (url, options)
{
  return got.put(this.fix(url), options)
}








module.exports = Agent;
