'use strict';
var flatten = require('flat');
var marked = require('marked');
var objectPath = require('object-path');

module.exports = function(exec, execmap) {

  var filters = {};

  filters.flatten = function(obj, args) {
    return exec(args, function(arg) {
        return flatten(obj);
    }, "flatten");
  };

  filters.hash = function(obj, args) {
    return exec(args, function(arg) {
        return require('crypto').createHash(arg || 'sha1').update(obj.toString()).digest('hex');
    }, "hash");
  };

  filters.nl2br = function(obj, args) {
    return exec(args, function(arg) {
        var sub = arg === true ? '<br/>' : '<br>';
        if (typeof obj === 'string') {
          return obj.replace(/\n/g, sub);
        }
        return obj;
    }, "nl2br");
  };

  filters.objectPath = function(obj, args) {
    return execmap(args, function(arg) {
        return objectPath.get(obj, arg);
    }, "objectpath");
  }

  filters.split = function(obj, args) {
    return exec(args, function(arg) {
        if(typeof(obj) == 'string') {
          return obj.split(arg);
        }
        else {
          return obj;
        }
    }, "split");
  }

  /*
   filters.stack = function(obj, args) {
     return exec(args, function(arg) {
         return Array.prototype.slice.call(arguments);
     }, "stack");
   }
   */

  filters.add2Array = function(obj, args) {
    return exec(args, function(arg) {
        if (obj instanceof Array) {
          return obj.push(arg);
        }
        else {
          return obj;
        }
    }, "add2Array");
  }

  filters.markdown = function(obj, args) {
    return exec(args, function(arg) {
        marked.setOptions(arg);
        return marked(obj);
    }, "stack");
  }
  return filters;
}
