/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
 ;

module.exports = function(router) {

  router.route('/-/echo/:basename.:extension')
  .get(function(req, res, next) {
      res.send({
          host: req.protocol + '//' + req.hostname,
          url : req.originalUrl,
          query : req.query || {}
      });
  });

}
