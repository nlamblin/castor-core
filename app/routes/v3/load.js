/*jshint node:true,laxcomma:true*/
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:routes:' + basename)
  , fs = require('fs')
  , url = require('url')
  , bodyParser = require('body-parser')
  , crypto = require('crypto')
  , Errors = require('../../helpers/errors.js')
  , Loader = require('castor-load')
 ;

module.exports = function(config, router) {
  var options = {
    "connexionURI" : config.get('connexionURI'),
    "concurrency" : config.get('concurrency'),
    "delay" : config.get('delay'),
    "maxFileSize" : config.get('maxFileSize'),
    "writeConcern" : config.get('writeConcern'),
    "ignore" : config.get('filesToIgnore'),
    "watch" : false
  };

  router.route('/-/v3/load')
  .all(bodyParser.urlencoded({ extended: true}))
  .post(function(req, res, next) {
      var ldr
        , referer = url.parse(req.get('Referer'))
        , resourceName = path.basename(referer.pathname)
        ;

      // TODO : check if req.body is valid
      // TODO : check if resourceName already exists

      if (resourceName === 'index') {
        return next(new Errors.Forbidden('`index` is read only'));
      }
      var common = {
        resourceName :  resourceName,
        baseURL : String(req.config.get('baseURL')).replace(/\/+$/,'')
      }

      if (req.body.type === 'file' && typeof req.body.file === 'object') {
        var p = require('os').tmpdir(); // upload go to tmpdir
        fs.readdir(p, function (err, files) {
            if (err) {
              throw err;
            }
            files.map(function (file) {
                return path.join(p, file);
            }).filter(function (file) {
                var token = crypto.createHash('sha1').update(file).digest('hex');
                return  (token === req.body.file.token);
            }).forEach(function (file) {
                debug('file', file);
                options['collectionName'] = resourceName;
                var ldr = new Loader(__dirname, options);
                ldr.use('**/*.xml', require('castor-load-xml')({}));
                ldr.use('**/*.csv', require('castor-load-csv')({}));
                ldr.use('**/*.xls', require('castor-load-excel')({}));
                ldr.use('**/*.xlsx', require('castor-load-excel')({}));
                ldr.use('**/*.nq', require('castor-load-nq')({}));
                ldr.use('**/*.nt', require('castor-load-nq')({}));
                ldr.use('**/*.n3', require('castor-load-nq')({}));
                ldr.use('**/*', require('../loaders/xid.js')());
                ldr.use('**/*', require('../loaders/extend.js')(common));
                ldr.use('**/*', require('../loaders/name.js')());
                ldr.push(file);
            });
        });
      }
      else if (req.body.type === 'text') {
        options['collectionName'] = resourceName;
        ldr = new Loader(__dirname, options);
        ldr.use('**/*.xml', require('castor-load-xml')({}));
        ldr.use('**/*.csv', require('castor-load-csv')({}));
        ldr.use('**/*.xls', require('castor-load-excel')({}));
        ldr.use('**/*.xlsx', require('castor-load-excel')({}));
        ldr.use('**/*.nq', require('castor-load-nq')({}));
        ldr.use('**/*.nt', require('castor-load-nq')({}));
        ldr.use('**/*.n3', require('castor-load-nq')({}));
        ldr.use('**/*', require('../loaders/xid.js')());
        ldr.use('**/*', require('../loaders/extend.js')(common));
        ldr.use('**/*', require('../loaders/name.js')());
        ldr.push(url.format({
              protocol: "http",
              hostname: "127.0.0.1",
              port: config.get('port'),
              pathname: "/-/v3/echo/keyboard." + req.body.loader,
              query: {
                plain : req.body.text
              }
        }));
      }
      else if (req.body.type === 'uri') {
        options['collectionName'] = resourceName;
        ldr = new Loader(__dirname, options);
        ldr.use('**/*.xml', require('castor-load-xml')({}));
        ldr.use('**/*.csv', require('castor-load-csv')({}));
        ldr.use('**/*.xls', require('castor-load-excel')({}));
        ldr.use('**/*.xlsx', require('castor-load-excel')({}));
        ldr.use('**/*.nq', require('castor-load-nq')({}));
        ldr.use('**/*.nt', require('castor-load-nq')({}));
        ldr.use('**/*.n3', require('castor-load-nq')({}));
        ldr.use('**/*', require('../loaders/xid.js')());
        ldr.use('**/*', require('../loaders/extend.js')(common));
        ldr.use('**/*', require('../loaders/name.js')());
        ldr.push(req.body.uri);
      }
      else {
        return next(new Errors.InvalidParameters('Unknown type.'));
      }
      res.json({});
  });

}
