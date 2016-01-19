/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , crypto = require('crypto')
  , bodyParser = require('body-parser')
  ;


module.exports = function(router, core) {

  var config = core.config;
  var passport = core.passport;

  router.route('/-/login')
  .post(bodyParser.urlencoded({ extended: true}))
  .post(passport.authenticate('local', { failureRedirect: '/-/login' }))
  .post(function(req, res, next) {
      debug('user', req.user);
      res.redirect('/');
  });

  router.route('/-/logout')
  .get(function (req, res) {
      req.logout();
      res.redirect('/');
  });

}




