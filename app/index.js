/*jshint node:true, laxcomma:true*/
"use strict";

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:' + basename)
  , pck = require('../package.json')
  , kuler = require('kuler')
  , express = require('express')
  , nunjucks = require('nunjucks')
  , browserify = require('browserify-middleware')
  ;

  module.exports = function(config, online) {


    var app = express();

    //
    // Middlewares :
    // add middlewares to Express
    //
    app.use(require('morgan')(config.get('logFormat'), { stream : process.stderr }));
    app.use(require('serve-favicon')(__dirname + '/views/favicon.ico'));
    app.use(function (req, res, next) {
        req.config = config;
        next();
    })

    //
    // Define the view template engine
    //
    //
    var env = nunjucks.configure(path.resolve(__dirname, "./views/"), {
        autoescape: false,
        watch: false,
        express: app
    });

    //
    // "Tags" for nunjucks
    //
    //
    //require('nunjucks-markdown').register(env, config.get('markdown'));

    //
    // "Filters" for nunjucks
    //
    //
    //env.addFilter('nl2br', require('./filters/nl2br.js')(config));


    //
    // DEfines Dynamics routes
    //
    app.use(require('./routes/table.js')(config));
    app.use(require('./routes/config.js')(config));
    app.use(require('./routes/files.js')(config));

    // app.route("/:authority" +  "/:resource").all(require('./routes/resource-display.js')(config));
    // app.route("/:authority" +  "/:resource.n3").all(require('./routes/resource-display-n3.js')(config));


    //
    // Set JS modules for the browser
    //
    //
    var modules = [ 'jquery', 'vue', 'moment', 'qs', 'marked' ];
    if (Array.isArray(modules) && modules.length > 0) {
      app.get('/-/bundle.js', browserify(modules, {
            debug: false
      }));
    }


    //
    // Define specials routes
    //
    //
    app.route('/assets/*').all(require('ecstatic')({
          root : path.resolve(__dirname, './views/assets'),
          baseDir : '/assets',
          cache         : 3600,
          showDir       : true,
          autoIndex     : true,
          humanReadable : true,
          si            : false,
          defaultExt    : 'html',
          gzip          : false
    }));
    app.route('/').all(function(req, res) { res.redirect('index'); });

    //
    // catch 404 and forward to error handler
    //
    //
    app.use(function(req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });


    //
    // error handler
    //
    //
    if (app.get('env') === 'development') {
      app.use(function(err, req, res, next) {
          res.status(err.status || 500);
          res.render('error.html', {
              name: err.name,
              message: err.message,
              error: err
          });
      });
    }
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error.html', {
            name: err.name,
            message: err.message
        });
    });


    //
    // Create HTTP server
    //
    //
    var server = require('http').createServer(app)
    server.listen(config.get('port'), function() {
        online(null, server);
    });

  }
