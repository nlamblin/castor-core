/*jshint node:true, laxcomma:true*/
"use strict";

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , fs = require('fs')
  , kuler = require('kuler')
  , express = require('express')
  , nunjucks = require('nunjucks')
  , browserify = require('browserify-middleware')
  , Loader = require('castor-load')
  , Computer = require('./helpers/compute.js')
  , kuler = require('kuler')
  , ecstatic = require('ecstatic')
  , I18n = require('i18n-2')
  , Errors = require('./helpers/errors.js')
  , Hook = require('./helpers/hook.js')
  ;

module.exports = function(config, online) {
  //
  // Default errors tracing
  //
  if (online === undefined || typeof online !== 'function') {
    online = function(err, server) {
      if (err instanceof Error) {
        console.error(kuler("Unable to init the server.", "red"), err.toString());
        process.exit(3);
        return;
      }
      var pack = config.get('package');
      if (pack) {
        console.info(kuler('App    :', 'olive'), kuler(pack.name + ' ' + pack.version, 'limegreen'));
      }
      console.info(kuler("Server is listening on " + config.get('baseURL') + "/", "green"));
    }
  }

  //
  // Load conf file attached to dataPath
  //
  var dateConfig;
  try {
    var confile = path.normalize(config.get('dataPath')) + '.json';
    if (fs.existsSync(confile)) {
      console.info(kuler('Configuration :', 'olive'), kuler(confile, 'limegreen'));
      config.merge(require(confile));
      dateConfig = fs.statSync(confile).mtime;
    }
  }
  catch(e) {
    return online(e);
  }

  //
  // Find & Detect view
  //
  var viewPath;
  try {
    viewPath = require('./helpers/view.js')(config);
  }
  catch(e) {
    return online(e);
  }


  //
  //  create an heart & set heartrate
  //
  var heart, pulse;
  try {
    heart = require('./helpers/heart.js')(config.get('heartrate'));
    pulse = heart.newPulse();
  }
  catch(e) {
    return online(e);
  }



  //
  // HOT folder
  //
  var ldr, ldropts;
  try {
    ldropts = {
      // "dateConfig" : dateConfig,
      "connexionURI" : config.get('connexionURI'),
      "collectionName": config.get('collectionName'),
      "concurrency" : config.get('concurrency'),
      "delay" : config.get('delay'),
      "maxFileSize" : config.get('maxFileSize'),
      "writeConcern" : config.get('writeConcern'),
      "ignore" : config.get('filesToIgnore')
    }
    ldr = new Loader(config.get('dataPath'), ldropts);

    if (fs.existsSync(config.get('dataPath'))) {
      debug('hot folder', config.get('dataPath'));
      ldr.use('**/*', require('./loaders/prepend.js')());
      var loaders = new Hook('loaders', config.get('hooks'));
      loaders.from(viewPath, __dirname, config.get('hooksPath'))
      loaders.over(config.get('loaders'))
      loaders.apply(function(hash, func, item) {
          ldr.use(item.pattern || '**/*', func(item.options , config));
      });
      ldr.use('**/*', require('./loaders/document.js')({
            stylesheet: config.get('documentFields')
      }));
      ldr.use('**/*', require('./loaders/xid.js')());
      ldr.sync(function(err) {
          if (err instanceof Error) {
            console.error(kuler(err.message, 'red'));
          }
          else {
            console.info(kuler('Files and Database are synchronised.', 'green'));
          }
      });
      config.set('collectionName', ldr.options.collectionName);
    }
  }
  catch(e) {
    return online(e);
  }

  //
  // Add Mongo indexes
  //


  // (...)


  //
  // Define Computer
  //
  var cpt, cptlock, cptopts;
  try {
    cptopts = {
      "port": config.get('port'),
      "connexionURI" : config.get('connexionURI'),
      "collectionName": config.get('collectionName'),
      "concurrency" : config.get('concurrency')
    }
    cpt = new Computer(config.get('corpusFields'), cptopts) ;

    cpt.use('count', require('./operators/count.js'));
    cpt.use('catalog', require('./operators/catalog.js'));
    cpt.use('distinct', require('./operators/distinct.js'));
    cpt.use('ventilate', require('./operators/ventilate.js'));
    cpt.use('total', require('./operators/total.js'));
    cpt.use('graph', require('./operators/graph.js'));
    cpt.use('groupby', require('./operators/groupby.js'));
    cpt.use('merge', require('./operators/merge.js'));

    var operators = new Hook('operators', config.get('hooks'))
    operators.from(viewPath, __dirname, config.get('hooksPath'))
    operators.over(config.get('operators'))
    operators.apply(function(hash, func) {
        cpt.use(hash, func);
    });
    var cptfunc = function(err, doc) {
      if (cptlock === undefined || cptlock === false) {
        cptlock = true;
        heart.createEvent(2, {repeat: 1}, function() {
            cptlock = false; // évite d'oublier un evenement pendant le calcul
            cpt.run(function(err) {
                if (err instanceof Error) {
                  console.error(kuler(err.message, 'red'));
                }
                else {
                  console.info(kuler('Corpus fields computed.', 'green'));
                }
            });
        });
      }
    };
    ldr.on('watching', cptfunc);
    ldr.on('changed', cptfunc);
    ldr.on('cancelled', cptfunc);
    ldr.on('dropped', cptfunc);
    ldr.on('added', cptfunc);
  }
  catch(e) {
    return online(e);
  }
  //
  // WEB Server
  //
  var app = express();



  //
  // is it behind a proxy,
  //
  if (config.get('trustProxy') === true) {
    app.enable('trust proxy');
  }



  //
  // Add middlewares to Express
  //
  try {
    app.use(require('morgan')(config.get('logFormat'), { stream : process.stderr }));
    app.use(require('serve-favicon')(path.resolve(viewPath, './favicon.ico')));
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
    var middlewares = new Hook('middlewares', config.get('hooks'))
    middlewares.from(viewPath, __dirname, config.get('hooksPath'))
    middlewares.over(config.get('middlewares'))
    middlewares.apply(function(hash, func, item) {
        app.use(item.path || hash, func(item.options || config, config));
    });
  }
  catch(e) {
    return online(e);
  }


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
  var env = nunjucks.configure(viewPath, {
      autoescape: false,
      watch: false,
      express: app
  });



  //
  // "Tags" for nunjucks
  //
  //
  require('nunjucks-markdown').register(env, config.get('markdown'));



  //
  // "Filters" for nunjucks
  //
  //
  env.addFilter('nl2br', require('./filters/nl2br.js')(config));
  env.addFilter('json', require('./filters/json.js')(config));
  env.addFilter('hash', require('./filters/hash.js')(config));
  env.addFilter('stack', require('./filters/stack.js')(config));
  env.addFilter('flatten', require('./filters/flatten.js')(config));
  env.addFilter('add2Array', require('./filters/add2Array.js')(config));
  env.addFilter('objectPath', require('./filters/objectPath.js')(config));
  env.addFilter('markdown', require('./filters/markdown.js')(config.get('markdown')));

  var filters = new Hook('filters', config.get('hooks'))
  filters.from(viewPath, __dirname, config.get('hooksPath'))
  filters.over(config.get('filters'))
  filters.apply(function(hash, func) {
      env.addFilter(hash, func(config));
  });

  var asynchronousFilters = new Hook('filters', config.get('hooks'))
  asynchronousFilters.from(viewPath, __dirname, config.get('hooksPath'))
  asynchronousFilters.over(config.get('asynchronousFilters'))
  asynchronousFilters.apply(function(hash, func) {
      env.addFilter(hash, func(config), true);
  });



  //
  // Set JS modules for the browser
  //
  //
  var modules = config.get('browserifyModules');
  if (Array.isArray(modules) && modules.length > 0) {
    app.get('/libs.js', browserify(modules, {
          debug: true
    }));
    app.get('/bundle.js', function(req, res) {
        console.warn('Depretacted route, use /libs.js');
        res.redirect(301, '/libs.js');
    });
  }
  else {
    app.get('/libs.js', function(req, res, next) {
        next(new Errors.PageNotFound('Not Found'));
    });
    app.get('/bundle.js', function(req, res, next) {
        next(new Errors.PageNotFound('Not Found'));
    });
  }



  //
  // Define reserved routes : /libs, /assets, /
  //
  //
  app.route('/assets/*').all(ecstatic({
        root          : path.resolve(viewPath, './assets'),
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
        root          : path.resolve(viewPath, './libs'),
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
      res.redirect(config.get('rootURL'));
  });

  //
  // Defines customs routes
  //

  var routes = new Hook('routes', config.get('hooks'))
  routes.from(viewPath, __dirname, config.get('hooksPath'))
  routes.over(config.get('routes'))
  routes.apply(function(hash, func, item) {
      var method =  item.method || 'all';
      app.route(item.path || hash)[method](func(item.options || config));
  });


  //
  // Defines Dynamics routes
  //
  app.use(require('./routes/config.js')(config));
  app.use(require('./routes/v2.js')(config, cpt));
  app.use(require('./routes/v3.js')(config, cpt));
  app.use(require('./routes/page.js')(config));
  app.use(require('./routes/table.js')(config));



  //
  // catch 404 and forward to error handler
  //
  app.use(function(req, res, next) {
      next(new Errors.PageNotFound('Not Found'));
  });



  //
  // Route Errors handler
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
      console.error(kuler("ERROR", "red"), err.toString());
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
