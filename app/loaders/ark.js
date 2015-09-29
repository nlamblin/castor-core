'use strict';

module.exports = function(options) {
  options = options || {};
  options.authority = options.authority || undefined;
  options.range = options.range || 0;
  return function (input, submit) {
    if (options.authority === undefined) {
      return submit(new Error('No Authority'), null);
    }
    input.ark = 'XXX/WWWWW';
    submit(null, input);
  }
}
