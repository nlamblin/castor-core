/*jshint node:true, laxcomma:true*/
"use strict";

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:' + basename)
  , fs = require('fs')
  , kuler = require('kuler')
  , express = require('express')
  , nunjucks = require('nunjucks')
  , browserify = require('browserify-middleware')
  , Loader = require('castor-load')
  , kuler = require('kuler')
  , ecstatic = require('ecstatic')
  , I18n = require('i18n-2')
  , Errors = require('./errors.js')
  ;

  module.exports = function(config, online) {

    var app = express();
    //
    // is it behind a proxy,
    //
    if (config.get('trustProxy') === true) {
      app.enable('trust proxy');
    }

    //
    // Middlewares :
    // add middlewares to Express
    //
    app.use(require('morgan')(config.get('logFormat'), { stream : process.stderr }));
    app.use(require('serve-favicon')(__dirname + '/views/favicon.ico'));
    app.use(require('cookie-parser')(__dirname));
    app.use(require('express-session')({
          secret: __dirname,
          cookie: {
            maxAge: 60000,
            secure: true
          },
          resave: false,
          saveUninitialized: true
    }));


    //
    // Add some vars in req
    //
    app.use(function (req, res, next) {
        req.config = config;
        next();
    });

    app.use(function (req, res, next) {
        req.routeParams = {};
        next();
    });


    //
    // Define I18N
    //
    I18n.expressBind(app, {
        locales: ['en', 'fr']
    });
    app.use(require('./middlewares/i18n.js')());

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
    env.addFilter('nl2br', require('./filters/nl2br.js')(config));
    env.addFilter('json', require('./filters/json.js')(config));


    //
    // Set JS modules for the browser
    //
    //
    var modules = [ 'vue', 'qs', 'oboe', 'faker'];
    if (Array.isArray(modules) && modules.length > 0) {
      app.get('/libs.js', browserify(modules, {
            debug: false
      }));
    }

    //
    // Define reserved routes : /libs, /assets, /
    //
    //
    app.route('/assets/*').all(ecstatic({
          root          : path.resolve(__dirname, './views/assets'),
          baseDir       : '/assets',
          cache         : 3600,
          showDir       : true,
          autoIndex     : true,
          humanReadable : true,
          si            : false,
          defaultExt    : 'html',
          gzip          : false
    }));
    app.route('/libs/*').all(ecstatic({
          root          : path.resolve(__dirname, './views/libs'),
          baseDir       : '/libs',
          cache         : 3600,
          showDir       : true,
          autoIndex     : true,
          humanReadable : true,
          si            : false,
          defaultExt    : 'html',
          gzip          : false
    }));
    app.route('/').all(function(req, res) {
        res.redirect('index');
    });


    //
    // Defines Dynamics routes
    //
    app.use(require('./routes/table.js')(config));
    app.use(require('./routes/config.js')(config));
    app.use(require('./routes/upload.js')(config));
    app.use(require('./routes/files.js')(config));


    //
    // catch 404 and forward to error handler
    //
    //
    app.use(function(req, res, next) {
        next(new Errors.PageNotFound('Not Found'));
    });


    //
    // error handler
    //
    //
    app.use(function(err, req, res, next) {
        if (err instanceof Errors.PageNotFound) {
          res.status(404);
        }
        else if (err instanceof Errors.InvalidParameters) {
          res.status(400);
        }
        else if (err instanceof Errors.Forbidden) {
          res.status(403);
        }
        else {
          res.status(500);
        }
        res.render('error.html', {
            name: err.name,
            message: err.message,
            error: app.get('env') === 'development' ? err : undefined
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
