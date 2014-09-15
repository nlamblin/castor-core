'use strict';

module.exports.map = function () {
  /* global exp, emit */
  var doc = this;
  function access(obj, prop) {
    var segs = prop.split('.');
    while (segs.length) {
      obj = obj[segs.shift()];
    }
    return obj;
  }
  var field = access(doc, exp);
  if (field) {
    emit(exp, 1);
  }
};

module.exports.reduce = function (key, values) {
  return Array.sum(values);
};


module.exports.finalize = function(items) {
  var results = {};
  items.forEach(function(e) { results[e._id] = e.value; });
  return results;
}
