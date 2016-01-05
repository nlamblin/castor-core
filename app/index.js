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
  ;

module.exports = function(config, online) {

  var core = {
    config : config,
    models : {},
    computer : undefined
  };


  var Errors = config.get('Errors');


  //
  // Default errors tracing
  //
  if (online === undefined || typeof online !== 'function') {
    online = function(err, server) {
      if (err instanceof Error) {
        console.error(kuler("Unable to init the server.", "red"), kuler(err.toString(), 'orangered'));
        process.exit(3);
        return;
      }
      var pack = config.get('package');
      if (pack) {
        console.info(kuler('App detected.', 'olive'), kuler(pack.name + ' ' + pack.version, 'limegreen'));
      }
      console.info(kuler('Server is listening.', 'olive'),  kuler(config.get('baseURL') + "/", "limegreen"));
    }
  }

  //
  // Load conf file attached to dataPath
  //
  var dateConfig;
  try {
    var confile = path.normalize(config.get('dataPath')) + '.json';
    if (fs.existsSync(confile)) {
      console.info(kuler('Load configuration file.', 'olive'), kuler(confile, 'limegreen'));
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
    console.info(kuler('Set view directory. ', 'olive'), kuler(viewPath, 'limegreen'));
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
  // Models
  //
  core.models.page = require('./models/page.js')
  core.models.mongo = require('./models/mongo.js')
  core.models.reduceTable = require('./models/reduce-table.js')
  core.models.getRoot = require('./models/get-root.js')
  core.models.getTable = require('./models/get-table.js')
  core.models.getDocument = require('./models/get-document.js')
  core.models.getDocuments = require('./models/get-documents.js')
  core.models.dumpQuery = require('./models/dump-query.js')
  core.models.computeDocuments = require('./models/compute-documents.js')
  core.models.postColumn = require('./models/post-column.js')
  core.models.postTable = require('./models/post-table.js')

  var models = new Hook('models');
  models.from(viewPath, __dirname)
  models.over(config.get('models'))
  models.apply(function(hash, func, item) {
      core.models[hash] = func;
  });

  core.loaders = [];
  core.loaders.push(['**/*', require('./loaders/prepend.js'), {}]);

  var loaders = new Hook('loaders');
  loaders.from(viewPath, __dirname)
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
  try {
    ldropts = {
      // "dateConfig" : dateConfig,
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
          ldr.use(loader[0], loader[1](loader[2]));
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
    core.connect().then(function(db) {
        db.collection(config.get('collectionName')).then(function(coll) {
            debug('indexes', coll);
            var usfs = config.get('documentFields');
            core.indexes = Object.keys(usfs)
            .filter(function(i) { return (i !== '$text') && (usfs[i].noindex !== true); })
            .map(function(i) {var j = {}; j[i.replace('$','')] = 1; return j;})
            ;
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

      var operators = new Hook('operators')
      operators.from(viewPath, __dirname)
      operators.over(config.get('operators'))
      operators.apply(function(hash, func) {
          core.computer.use(hash, func);
      });
      var cptfunc = function(err, doc) {
        if (cptlock === undefined || cptlock === false) {
          cptlock = true;
          heart.createEvent(2, {repeat: 1}, function() {
              cptlock = false; // évite d'oublier un evenement pendant le calcul
              core.computer.run(function(err) {
                  if (err instanceof Error) {
                    console.error(kuler("Unable to compute some fields.", "red"), kuler(err.toString(), 'orangered'));
                  }
                  else {
                    console.info(kuler('Corpus fields computed.', 'olive'));
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
      var middlewares = new Hook('middlewares')
      middlewares.from(viewPath, __dirname)
      middlewares.over(config.get('middlewares'))
      middlewares.apply(function(hash, func, item) {
          app.use(item.path || hash, func(item.options || config, config));
      });
    }
    catch(e) {
      return online(e);
    }





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
    // JBJ
    //
    //
    var filters = new Hook('filters')
    filters.from(viewPath, __dirname)
    filters.over(config.get('filters'))
    filters.apply(function(hash, func) {
        JBJ.use(func());
    });
    Object.keys(JBJ.filters).forEach(function(filterName) {
        env.addFilter(filterName, JBJ.filters[filterName]);
    });
    JBJ.register('local:', protocols('local', config));
    JBJ.register('http:', protocols('http', config));
    JBJ.register('https:', protocols('https', config));

    //
    // Add some vars in req
    //
    app.use(function (req, res, next) {
        req.routeParams = {};
        req.config = config;
        req.core = core;
        next();
    });
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
    // Define I18N
    //
    I18n.expressBind(app, {
        locales: ['en', 'fr']
    });
    app.use(require('./middlewares/i18n.js')());



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

    if (config.get('rootURL') !== undefined) {
      app.route('/').all(function(req, res) {
          res.redirect(config.get('rootURL'));
      });
    }


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
    routes.from(viewPath, __dirname)
    routes.over(config.get('routes'))
    routes.apply(function(hash, func, item) {
        var router = express.Router();
        func(router, core)
        app.use(router);
    });

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
        console.error(kuler("Route error.", "red"), kuler(err.toString(), 'orangered'));
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
