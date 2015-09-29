/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , datamodel = require('datamodel')
  , express =  require('express')
  , bodyParser = require('body-parser')
  ;

module.exports = function(config, ldr, cpt) {

  var router = express.Router();
  /*
  router.route('/-/v2/browse.:format').all(require('./routes/browse.js')(config));
  router.route('/-/v2//corpus.:format').all(require('./routes/corpus.js')(config));
  router.route('/-/v2/compute.:format').all(require('./routes/compute.js')(config, cpt));
  router.route('/-/v2//display/:doc.:format').all(require('./routes/display.js')(config));
  router.route('/-/v2/dump/:doc.:format').all(require('./routes/dump.js')(config));
  router.route('/-/v2/save/:doc').all(bodyParser.urlencoded({ extended: false })).post(require('./routes/save.js')(config));
  router.route('/-/v2/drop/:doc').all(bodyParser.urlencoded({ extended: false })).post(require('./routes/drop.js')(config));
  */
  return router;
};
