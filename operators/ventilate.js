'use strict';


module.exports.map = function () {
  /* global exp, emit */
  var doc = this;
  function access(obj, prop) {
    var segs = prop.split('.');
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
  var fields, field;
  if (Array.isArray(exp)) {
    fields = exp;
  }
  else {
    fields = [exp];
  }
  fields.forEach(function (xp) {
    field = access(doc, xp);
    if (field !== undefined) {
      emit(JSON.stringify([xp,field]), 1);
    }
  }
);
};

module.exports.reduce = function (key, values) {
  return Array.sum(values);
};


module.exports.finalize = function(items) {
  var r = [];
  items.forEach(function(e) {
    var x = JSON.parse(e._id);
    r.push({
      source: x[0],
      target: x[1],
      weight: e.value
    });
  });
  return r;
}
