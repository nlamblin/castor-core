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
      else {
        obj = undefined;
      }
    }
    return obj;
  } 
  var field = access(doc, exp[0]);
  if (field !== undefined) {
    emit(exp[0], field);
  }
};

module.exports.reduce = function (key, values) {
  return Array.sum(values);
};


module.exports.finalize = function(items) {
  var results = {};
  if (Array.isArray(items)) {
    items.forEach(function(e) { results[e._id] = e.value; });
  }
  return results;
}
