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
  , Hook = require('./helpers/hook.js')
  , protocols = require('./helpers/protocols.js')
  , async = require('async')
  , extend =  require('extend')
  , MongoClient = require('mongodb').MongoClient
  , JBJ = require('jbj')
  , ACL = require('./helpers/acl.js')
  , passport = require('passport')
  , Errors = require('./helpers/errors.js')
  , Agent = require('./helpers/agent.js')
  , querystring = require('querystring')
  , datamodel = require('datamodel')
  , objectPath = require("object-path")
  ;

module.exports = function(config, online) {

  var core = {
    states : { },
    config : config,
    models : {},
    connect : undefined,
    computer : undefined,
    heart: undefined,
    agent : new Agent(config.get('port')),
    passport : passport,
    acl : new ACL(),
    Errors : Errors
  };


  //
  // Passport
  //
  core.passport.serializeUser(function(user, done) {
    done(null, JSON.stringify(user));
  });
  core.passport.deserializeUser(function(user, done) {
    done(null, JSON.parse(user));
  });



  //
  // Find & Detect extensionPath & viewPath
  //
  var extensionPath, viewPath;
  try {
    extensionPath = require('./helpers/view.js')(config);
    console.info(kuler('Set extension directory. ', 'olive'), kuler(extensionPath, 'limegreen'));
    viewPath = path.resolve(extensionPath, './views')
    if (!fs.existsSync(viewPath)) {
      viewPath = extensionPath;
    }
  }
  catch(e) {
    return online(e);
  }

  var assetsPath = [
    path.resolve(extensionPath, './assets'),
    path.resolve(viewPath, './assets'),
    path.resolve(__dirname, './assets')
  ].filter(fs.existsSync).shift();
  if (assetsPath === undefined) {
    return online(new Error('assetsPath is not defnied'));
  }

  //
  //  create an heart & set heartrate
  //
  var pulse;
  try {
    core.heart = require('./helpers/heart.js')(config.get('heartrate'));
    pulse = core.heart.newPulse();
  }
  catch(e) {
    return online(e);
  }
  var heartbeats = new Hook('heartbeats');
  heartbeats.from(extensionPath, __dirname)
  heartbeats.over(config.get('heartbeats'))
  heartbeats.apply(function(hash, func, item) {
    item.repeat = Number(item.repeat);
    item.beat = Number(item.beat);
    core.heart.createEvent(Number.isNaN(item.beat) ? 1 : item.beat, {repeat: Number.isNaN(item.repeat) ? 0 : item.repeat}, func(item.options, core));
  });



  //
  // Models
  //
  core.models.page = require('./models/page.js')
  core.models.init = require('./models/init.js')
  core.models.mongo = require('./models/mongo.js')
  core.models.alt = require('./models/alt-parameter.js')
  core.models.typ = require('./models/typ-parameter.js')
  // core.models.reduceTable = require('./models/reduce-table.js')
  core.models.getRoot = require('./models/get-root.js')
  core.models.getRootDocument = require('./models/get-root-document.js')
  core.models.getTable = require('./models/get-table.js')
  core.models.getDocument = require('./models/get-document.js')
  core.models.getDocuments = require('./models/get-documents.js')
  core.models.dumpQuery = require('./models/dump-query.js')
  core.models.computeDocuments = require('./models/compute-documents.js')
  core.models.postColumn = require('./models/post-column.js') // DEPRECATED
  core.models.postTable = require('./models/post-table.js') // DEPRECATED
  core.models.loadTable = require('./models/load-table.js')

  var models = new Hook('models');
  models.from(extensionPath, __dirname)
  models.over(config.get('models'))
  models.apply(function(hash, func, item) {
    core.models[hash] = func;
  });


  //
  // Check Database & Collections Index
  //
  datamodel([core.models.mongo, core.models.init])
  .apply(core)
  .then(function(res) {
    if (res.initState) {
      console.info(kuler('Collections index initialized.', 'olive'), kuler(core.config.get('collectionsIndexName'), 'limegreen'));
    }
  }).catch(online);


  //
  // Loaders
  //
  core.loaders = [];
  core.loaders.push(['**/*', require('./loaders/prepend.js'), {}]);

  var loaders = new Hook('loaders');
  loaders.from(extensionPath, __dirname)
  loaders.over(config.get('loaders'))
  loaders.apply(function(hash, func, item) {
    core.loaders.push([item.pattern || '**/*', func, item.options]);
  });
  core.loaders.push(['**/*', require('./loaders/document.js'), { stylesheet: config.get('documentFields') }]);
  core.loaders.push(['**/*', require('./loaders/append.js'), {}]);


  //
  // HOT folder
  //
  var ldr, ldropts;
  if (config.has('dataPath')) {
    objectPath.set(core.states, 'hotfolder.first.syncOver', false);
    try {
      ldropts = {
        // "dateConfig" : config.get('dateConfig'),
        "connexionURI" : config.get('connectionURI'),
        "collectionName": config.get('collectionName'),
        "concurrency" : config.get('concurrency'),
        "delay" : config.get('delay'),
        "maxFileSize" : config.get('maxFileSize'),
        "writeConcern" : config.get('writeConcern'),
        "ignore" : config.get('filesToIgnore')
      }
      ldr = new Loader(config.get('dataPath'), ldropts);

      if (fs.existsSync(config.get('dataPath'))) {
        console.info(kuler('Watching hot directory. ', 'olive'), kuler(config.get('dataPath'), 'limegreen'));
        core.loaders.forEach(function(loader) {
          ldr.use(loader[0], loader[1](loader[2], core));
        });
        ldr.sync(function(err) {
          if (err instanceof Error) {
            console.error(kuler("Loader synchronization failed.", "red"), kuler(err.toString(), 'orangered'));
          }
          else {
            console.info(kuler('Files and Database are synchronised.', 'olive'));
          }
        });
        config.set('collectionName', ldr.options.collectionName);
      }
    }
    catch(e) {
      return online(e);
    }
  }

  //
  // Add Mongo indexes
  //
  core.indexes = [];
  core.indexes.push({ '_wid': 1 }); // wid = fid + number (which are unique)
  core.indexes.push({ '_text': 'text' });
  core.indexes.push({ 'state': 1 });
  core.connect = function() {
    return MongoClient.connect(config.get('connectionURI'));
  }
  try {
    core.connect()
    .then(function(db) {
      db.collection(config.get('collectionName'))
      .then(function(coll) {
        debug('indexes', coll);
        var usfs = config.get('documentFields');
        core.indexes = Object.keys(usfs)
        .filter(function(i) {
          return (i !== '$text') && (usfs[i].noindex !== true);
        })
        .map(function(i) {
          var j = {}; j[i.replace('$','')] = 1; return j;
        });
        async.map(core.indexes, function(i, cb) {
          coll.ensureIndex(i, { w: config.get('writeConcern')}, function(err, indexName) {
            if (err instanceof Error) {
              console.error(kuler("Unable to create the index.", "red"), kuler(err.toString(), 'orangered'));
            }
            else {
              console.info(kuler('Index added.', 'olive'), kuler(Object.keys(i)[0] + '/' + indexName, 'limegreen'));
            }
            cb(err, indexName);
          });
        }, function(e, ret) {
          if (e) {
            throw e;
          }
          db.close();
        });
      }).catch(function(e) {
        throw e;
      });
    }).catch(function(e) {
      throw e;
    });
  }
  catch(e) {
    return online(e);
  }


  //
  // Define Computer
  //

  var cptlock, cptopts;
  try {
    cptopts = {
      "port": config.get('port'),
      "connectionURI" : config.get('connectionURI'),
      "collectionName": config.get('collectionName'),
      "concurrency" : config.get('concurrency')
    }
    core.computer = new Computer(config.get('corpusFields'), cptopts) ;

    core.computer.use('count', require('./operators/count.js'));
    core.computer.use('catalog', require('./operators/catalog.js'));
    core.computer.use('distinct', require('./operators/distinct.js'));
    core.computer.use('ventilate', require('./operators/ventilate.js'));
    core.computer.use('total', require('./operators/total.js'));
    core.computer.use('graph', require('./operators/graph.js'));
    core.computer.use('groupby', require('./operators/groupby.js'));
    core.computer.use('merge', require('./operators/merge.js'));
    core.computer.use('labelize', require('./operators/labelize.js'));

    var operators = new Hook('operators')
    operators.from(extensionPath, __dirname)
    operators.over(config.get('operators'))
    operators.apply(function(hash, func) {
      core.computer.use(hash, func);
    });
    var cptfunc = function() {
      if (cptlock === undefined || cptlock === false) {
        cptlock = true;
        core.heart.createEvent(2, {repeat: 1}, function() {
          cptlock = false; // évite d'oublier un evenement pendant le calcul
          core.computer.run(function(err) {
            if (err instanceof Error) {
              console.error(kuler("Unable to compute some fields.", "red"), kuler(err.toString(), 'orangered'));
            }
            else {
              console.info(kuler('Corpus fields computed.', 'olive'));
              objectPath.set(core.states, 'hotfolder.first.syncOver', true);
            }
          });
        });
      }
    };
    if (ldr !== undefined) {
      ldr.on('browseOver', function (found) {
        objectPath.set(core.states, 'hotfolder.last.browseOver', found);
      });
      ldr.on('watching', function (err, doc) {
        objectPath.set(core.states, 'hotfolder.last.watching', doc);
        cptfunc();
      });
      ldr.on('checked', function (err, doc) {
        objectPath.set(core.states, 'hotfolder.last.checked', doc);
        cptfunc();
      });
      ldr.on('cancelled', function (err, doc) {
        objectPath.set(core.states, 'hotfolder.last.cancelled', doc);
        cptfunc();
      });
      ldr.on('added', function (err, doc) {
        objectPath.set(core.states, 'hotfolder.last.added', doc);
        cptfunc();
      });
      ldr.on('changed', function (err, doc) {
        objectPath.set(core.states, 'hotfolder.last.changed', doc);
        cptfunc();
      });
      ldr.on('dropped', function (err, doc) {
        objectPath.set(core.states, 'hotfolder.last.dropped', doc);
        cptfunc();
      });
      ldr.on('saved', function (doc) {
        objectPath.set(core.states, 'hotfolder.last.saved', doc);
        cptfunc();
      });

    }
  }
  catch(e) {
    return online(e);
  }


  //
  // Load strategies for PassportJS
  //
  var strategies = new Hook('strategies')
  strategies.from(extensionPath, __dirname)
  strategies.over(config.get('strategies'))
  strategies.apply(function(hash, func, item) {
    core.passport.use(func(item.options, core));
  });


  //
  // Load authorizations
  //
  var authorizations = new Hook('authorizations')
  authorizations.from(extensionPath, __dirname)
  authorizations.over(config.get('authorizations'))
  authorizations.apply(function(hash, func, item) {
    core.acl.use(item.pattern, func(item.options, core));
  });
  core.acl.use('* /**', require('./authorizations/recall.js')());



  //
  // define WEB Server
  //
  var app = express();

  // http://expressjs.com/en/api.html#app.locals
  app.locals = config.expose();

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
    app.use(function (req, res, next) {
      req.routeParams = {};
      req.config = config;
      req.core = core;
      next();
    });
    app.use(require('morgan')(config.get('logFormat'), { stream : process.stderr }));
    app.use(require('serve-favicon')(path.resolve(viewPath, './favicon.ico')));
    app.use(require('cookie-parser')());
    app.use(require('express-session')({ secret: __dirname, resave: false, saveUninitialized: false }));
    app.use(passport.initialize());
    app.use(passport.session());
    I18n.expressBind(app, {
      locales: ['en', 'fr'],
      directory: path.resolve(extensionPath, './locales')
    });
    app.use(require('./middlewares/i18n.js')());

    var middlewares = new Hook('middlewares')
    middlewares.from(extensionPath, __dirname)
    middlewares.over(config.get('middlewares'))
    middlewares.apply(function(hash, func, item) {
      app.use(item.path || hash, func(item.options, core));
    });
  }
  catch(e) {
    return online(e);
  }





  //
  // Define the view template engine
  //
  //
  var env = nunjucks.configure([viewPath, path.resolve(__dirname, './views/')], {
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
  // JBJ
  //
  //
  var filters = new Hook('filters')
  filters.from(extensionPath, __dirname)
  filters.over(config.get('filters'))
  filters.apply(function(hash, func) {
    JBJ.use(func);
  });
  Object.keys(JBJ.filters).forEach(function(filterName) {
    env.addFilter(filterName, function(filterInput, filterStylesheet, filterCallback) {
      if (filterCallback === undefined) {
        filterCallback = filterStylesheet;
      }
      var filterFunc = JBJ.filters[filterName];
      if (filterFunc.length === 3) {
        filterFunc(filterInput, filterStylesheet, filterCallback);
      }
      else {
        filterCallback(null, filterFunc(filterInput, filterStylesheet));
      }
    }, true);
  });
  JBJ.register('local:', protocols('local', config));
  JBJ.register('http:', protocols('http', config));
  JBJ.register('https:', protocols('https', config));

  //
  // Add some vars in req
  //
  app.use(function (req, res, next) {
    res.renderString = function(input, options, callback) {
      var context = {}
      extend(context, res.locals)
      extend(context, options)
      env.renderString(input, context, function(err, output) {
        if (callback !== undefined) {
          callback(err, output);
        }
        else {
          if (err) {
            throw err;
          }
          else {
            res.write(output);
            res.end();
          }
        }
      });
    }
    next();
  });

  //
  // Set JS modules for the browser
  //
  var modules = config.get('browserifyModules');
  if (Array.isArray(modules) && modules.length > 0) {

    var browserifyOptions = {
      transform : []
    }
    var browserifyTransformers = new Hook('browserifyTransformers')
    filters.from(extensionPath, __dirname)
    filters.over(config.get('browserifyTransformers'))
    filters.apply(function(hash, func, item) {
      browserifyOptions.transform.push([func, item.options]);
    });

    app.get('/libs.js', browserify(modules, browserifyOptions));
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
  app.route('/assets/*').all(ecstatic({
    root          : assetsPath,
    baseDir       : '/assets',
    cache         : 3600,
    showDir       : true,
    autoIndex     : true,
    humanReadable : true,
    si            : false,
    defaultExt    : 'html',
    gzip          : false
  }));

  var libsPath = [path.resolve(extensionPath, './libs'), path.resolve(viewPath, './libs')].filter(fs.existsSync).shift();
  if (assetsPath !== undefined) {
    app.route('/libs/*').all(ecstatic({
      root          : libsPath,
      baseDir       : '/libs',
      cache         : 3600,
      showDir       : true,
      autoIndex     : true,
      humanReadable : true,
      si            : false,
      defaultExt    : 'html',
      gzip          : false
    }));
  }

  if (config.get('rootURL') !== undefined && config.get('rootURL') !== '/') {
    app.route('/').all(function(req, res) {
      res.redirect(config.get('rootURL'));
    });
  }


  //
  // Access for route
  //
  app.route('/*').all(core.acl.route());




  //
  // Mandatory route
  //

  var pageRouter = express.Router();
  require('./routes/page.js')(pageRouter, core)
  app.use(pageRouter);

  //
  // Optionals routes
  //
  var routes = new Hook('routes')
  routes.from(extensionPath, __dirname)
  routes.over(config.get('routes'))
  routes.apply(function(hash, func, item) {
    var router = express.Router();
    func(router, core)
    app.use(router);
  });

  //
  // Mandatory route
  //
  var restRouter = express.Router();
  require('./routes/rest.js')(restRouter, core)
  app.use(restRouter);



  //
  // catch 404 and forward to error handler
  //
  app.use(function(req, res, next) {
    next(new Errors.PageNotFound('Not Found'));
  });



  //
  // Route Errors handler
  //
  app.use(function errorsHandler(err, req, res, next) {
    var statusCode;
    if (res.headersSent === false) {
      if (err instanceof Errors.PageNotFound || err instanceof Errors.TableNotFound) {
        statusCode = 404;
      }
      else if (err instanceof Errors.InvalidParameters) {
        statusCode = 400;
      }
      else if (err instanceof Errors.Forbidden) {
        statusCode = 403;
      }
      else {
        statusCode = 500;
      }
    }
    if (req.user === undefined && statusCode === 403 && config.get('loginURL')) {
      res.redirect(config.get('loginURL') + '?' + querystring.stringify({  'url' : req.originalUrl }));
      return;
    }
    res.status(statusCode);
    console.error(kuler("Route error for", "red"), req.originalUrl, kuler(statusCode + ' - ' + err.toString(), 'orangered'), ' from ', req.get('referer'));
    if (req.accepts('html')) {
      res.render('error.html', {
        code: statusCode,
        name: err.name,
        message: err.message,
        error: err
      });
      return;
    }
    if (req.accepts('json')) {
      res.send({
        code: statusCode,
        name: err.name,
        message: err.message,
      });
        return;

      }
      res.type('text').send(err.toString());
    });


    //
    // Create HTTP server
    //
    //
    var server = require('http').createServer(app)
    server.listen(config.get('port'), function() {
      online(null, server);
    });


    return server;
  }
