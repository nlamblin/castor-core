/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  ;

module.exports = function(router) {

  router.route('/-/v3/status.js(on|)')
  .get(function (req, res) {
    res.set('Content-Type', 'text/javascript');
    var data = {
      uptime : process.uptime()
    }
      res.jsonp(data);
  });

}
