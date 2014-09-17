'use strict';


module.exports.map = function () {
  /* global exp, emit */
  var doc = this
    , sel = exp
    , invert = (sel[0] === '-' ? true :  false);
  if (invert) {
    sel = sel.slice(1);
  }
  function browse(obj, prefix) {
    if (prefix) {
      prefix += '.';
    } else {
      prefix = '';
    }
    for (var prop in obj) {
      var key = prefix, value = obj[prop];
      key += isNaN(parseInt(prop)) ? prop : '0';
      if (typeof value === 'object'
        && prop !== '_id'
        && ! (value instanceof Date)
      ) {
        browse(value, key);
      } else {
        if (sel === '*') {
          emit(key, null);
        }
        if (key.indexOf(sel) === 0 && invert === false) {
          emit(key, null);
        }
        else if (key.indexOf(sel) !== 0 && invert === true ) {
          emit(key, null);
        }
      }
    }
  }
  browse(doc);
}

module.exports.reduce = function (key, values) {
  return null;
}


module.exports.finalize = function(items) {
  return items.map(function(e) { return e._id; });
}
