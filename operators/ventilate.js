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
  var fields, field;
  if (Array.isArray(exp)) {
    fields = exp;
  }
  else {
    fields = [exp];
  }
  fields.forEach(function (exp) {
    field = access(doc, exp);
    if (field !== undefined) {
      emit(exp + '=' + access(doc, exp), 1);
    }
  }
);
};

module.exports.reduce = function (key, values) {
  return Array.sum(values);
};


module.exports.finalize = function(items) {
  var r =  {};
  items.each(function(e) {
    var id = e._id.split('=', 1).shift(),
        value = e._id.slice(e._id.indexOf('=') + 1),
        count = e.value;
    if (r[id] === undefined) {
      r[id] = [];
    }
    r[id].push({value: value, count:count});
  });
  return r;
}
