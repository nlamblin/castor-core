'use strict';


module.exports.map = function () {
  /* global fields, emit */
  var doc = this;
  function access(obj, prop) {
    var segs = prop.split('.');
    while (segs.length) {
      obj = obj[segs.shift()];
    }
    return obj;
  }
  fields.forEach(function (exp) {
    emit(exp + '=' + access(doc, exp), 1);
  }
);
};

module.exports.reduce = function (key, values) {
  var c = 0;
  values.forEach(function (cur) {
    c += cur;
  });
  return c;
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
