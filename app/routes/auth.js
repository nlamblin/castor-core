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
  .post(function(req, res, next) {
      var auth = function(err, user, info) {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.redirect(req.get('Referer'));
        }
        debug('user', req.user);
        res.redirect('/');
      }
      passport.authenticate('local', auth)(req, res, next);
  });

  router.route('/-/logout')
  .get(function (req, res) {
      req.logout();
      res.redirect('/');
  });

}




