/*jshint node:true, laxcomma:true*/
"use strict";

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:' + basename)
  , util = require('util')
  , fs = require('fs')
  , os = require('os')
  , pck = require('./package.json')
  , kuler = require('kuler')
  , express = require('express')
  , router = express.Router()
  , nunjucks = require('nunjucks')
  , morgan  = require('morgan')
  , browserify = require('browserify-middleware')
  , bodyParser = require('body-parser')
  , pmongo = require('promised-mongo')
  ;

  function serve (config, online) {


    var app = express();

    //
    // Middlewares :
    // add middlewares to Express
    //
    app.use(morgan(config.get('logFormat'), { stream : process.stderr }));


    //
    // Define the view template engine
    //
    //
    var env = nunjucks.configure("../www/", {
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
    app.use('/-/config', require('./routes/config-api.js')(config);

    app.route("/:authority" +  "/:resource").all(require('./routes/resource-display.js')(config));
    app.route("/:authority" +  "/:resource.n3').all(require('./routes/resource-display-n3.js')(config));


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
          root : path.join('../view', 'assets'),
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
    app.route('/:name.:format').all(require('./routes/page-display.js')(config));

    app.use(function(req, res, next) {
        res.status(404).send('Not Found').end();
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
