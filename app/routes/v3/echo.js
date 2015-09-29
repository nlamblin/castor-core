/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , Errors = require('../../helpers/errors.js')
 ;

module.exports = function(config, router) {

  router.route('/-/v3/echo/:basename.:extension')
  .get(function(req, res, next) {
      if (req.query.plain) {
        res.send(req.query.plain);
      }
      else {
        next(new Errors.InvalidParameters('No input.'));
      }
  });

}
