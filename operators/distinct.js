'use strict';

module.exports.map = function () {
  /* global exp, emit */
  var doc = this;
  function access(obj, prop) {
    var segs = prop.split('.');
    print(segs, obj);
    while (segs.length) {
      var k = segs.shift();
      if (obj[k]) {
        obj = obj[k];
      }
    }
    return obj;
  }
  var field = access(doc, exp[0]);
  if (field) {
    if (field instanceof Array) {
      field.forEach(function (e) {
        if (typeof e === 'string') {
          e = e.trim();
        }
        emit(e, 1);
      });
    }
    else {
      emit(field, 1);
    }
  }
  else {
    emit('?', 1);
  }
};

module.exports.reduce = function (key, values) {
  return Array.sum(values);
};

