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
  var values, fields  = exp;
  if (fields.length === 1) {
    values = access(doc, fields[0]);
    if (values !== undefined && !Array.isArray(values)) {
      values = [values];
    }
  }
  else if (fields.length > 1) {
    values = fields.map(function(v) {return access(doc, v);}).reduce(function(p, c) {
      return p.concat(c);
    }, []);
  }
  var seen = {};
  values.filter(function(item) {
    return seen.hasOwnProperty(item) ? false : (seen[item] = true);
  }).forEach(function(v, i) {
    values.slice(i + 1).forEach(function(w) {
      emit(JSON.stringify([v,w]), 1);
    });
  });
};

module.exports.reduce = function (key, values) {
  return Array.sum(values);
};

module.exports.finalize = function(items) {
  var r = [];
  items.each(function(e) {
    var x = JSON.parse(e._id);
    r.push({
      source: x[0],
      target: x[1],
      weight: e.value
    });
  });
  return r;
}
