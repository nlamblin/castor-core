/*jshint node:true, laxcomma:true*/
"use strict";

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , fs = require('fs')
  , os = require('os')
  , pck = require('./package.json')
  , config = require('./config.js')
  , Loader = require('castor-load')
  , Computer = require('castor-compute').Overall
  , portfinder = require('portfinder')
  , kuler = require('kuler')
  , express = require('express')
  , nunjucks = require('nunjucks')
  , morgan  = require('morgan')
  , browserify = require('browserify-middleware')
  , hook = require('./helpers/hook.js')
  , bodyParser = require('body-parser')
  , pmongo = require('promised-mongo')
  ;

function serve () {

  console.log(kuler('Core version :', 'olive'), kuler(pck.version, 'limegreen'));

  //
  // Data path :
  // Check and fix a data source directory
  //
  config.fix('dataPath', path.normalize(path.resolve(process.cwd(), path.normalize(process.argv.slice(2).shift() || 'data'))));
  var dataPath = config.get('dataPath') ;
  debug('dataPath', dataPath);

  //
  // Conf file :
  // Load conf file attached to dataPath
  //
  var dateConfig;
  var confile = path.normalize(dataPath) + '.json';
  if (fs.existsSync(confile)) {
    console.log(kuler('Configuration :', 'olive'), kuler(confile, 'limegreen'));
    config.load(confile);
    dateConfig = fs.statSync(confile).mtime;
  }

  //
  // View path :
  // Find and Check the directory's templates
  //
  var viewPath = require('./helpers/view.js')(config);

  //
  // Check & Fix required config parameters
  //
  config.fix('connexionURI',         'mongodb://localhost:27017/castor/');
  config.fix('collectionName',       undefined); // auto
  config.fix('hooks',                 []);
  config.fix('hooksPath',            undefined);
  config.fix('debug',                false);
  config.fix('port',                 '3000');
  config.fix('logFormat',            'combined');
  config.fix('title',                'Castor');
  config.fix('description',          '');
  config.fix('theme',                'default');
  config.fix('middlewares',          {});
  config.fix('markdown',             undefined);
  config.fix('filters',              {});
  config.fix('asynchronousFilters',  {});
  config.fix('operators',            {});
  config.fix('loaders',              {});
  config.fix('routes',               {});
  config.fix('browserifyModules',    []);
  config.fix('itemsPerPage',         30);
  config.fix('concurrency',          os.cpus().length);
  config.fix('writeConcern',         1);
  config.fix('delay',                250);
  config.fix('maxFileSize',          undefined);
  config.fix('heartrate',            5000);
  config.fix('turnoffAll',           false);
  config.fix('turnoffSync',          false);
  config.fix('turnoffPrimus',        false);
  config.fix('turnoffRoutes',        false);
  config.fix('turnoffIndexes',       false);
  config.fix('turnoffWebdav',        false);
  config.fix('turnoffComputer',      false);
  config.fix('turnoffUpload',        false);
  config.fix('filesToIgnore',        [ "**/.*", "~*", "*~", "*.sw?", "*.old", "*.bak", "**/node_modules", "Thumbs.db" ]);
  config.fix('tempPath',             os.tmpdir());
  config.fix('documentFields',       {});
  config.fix('corpusFields',         {});
  // config.fix('upload',               {});
  // config.fix('files:csv:separator', undefined); // auto
  // config.fix('files:csv:encoding', 'utf8');

  if (config.get('turnoffAll') === true) {
    config.set('turnoffSync', true);
    config.set('turnoffPrimus', true);
    config.set('turnoffRoutes', true);
    config.set('turnoffWebdav', true);
    config.set('turnoffIndexes', true);
  }

  //  create an heart & set heartrate
  var heart = require('./helpers/heart.js')(config.get('heartrate'))
    , pulse = heart.newPulse()
    ;


  console.log(kuler('Theme :', 'olive'), kuler(viewPath, 'limegreen'));

  //
  // add some statements when loading files to MongoDB
  //
  var ldropts = {
    "connexionURI" : config.get('connexionURI'),
    "collectionName": config.get('collectionName'),
    "concurrency" : config.get('concurrency'),
    "delay" : config.get('delay'),
    "maxFileSize" : config.get('maxFileSize'),
    "writeConcern" : config.get('writeConcern'),
    "ignore" : config.get('filesToIgnore'),
    "dateConfig" : dateConfig
  }, ldr = new Loader(dataPath, ldropts);

  if (fs.existsSync(dataPath)) {
    console.log(kuler('Source :', 'olive'), kuler(dataPath, 'limegreen'));
    ldr.use('**/*', require('./loaders/prepend.js')());
    hook('loaders', config.get('hooks'))
    .from(viewPath, __dirname, config.get('hooksPath'))
    .over(config.get('loaders'))
    .apply(function(hash, func, item) {
      ldr.use(item.pattern || '**/*', func(item.options));
    });
    ldr.use('**/*', require('castor-load-custom')({
      fieldname : 'fields',
      schema: config.get('documentFields')
    }));
    ldr.use('**/*', require('./loaders/append.js')());
    if (config.get('turnoffSync') === false) {
      ldr.sync(function(err) {
        console.log(kuler('Files and Database are synchronised.', 'green'));
      });
    }
    config.set('collectionName', ldr.options.collectionName);
  }
  else {
    config.set('turnoffUpload', true);
    config.set('turnoffWebdav', true);
    config.set('turnoffPrimus', true);
  }

  //
  // add some indexes
  //
  if (config.get('turnoffIndexes') === false) {
    var coll = pmongo(config.get('connexionURI')).collection(config.get('collectionName'))
      , usfs = config.get('documentFields')
      , idx = Object.keys(usfs).filter(function(i) { return (usfs[i].noindex !== true); }).map(function(i) {var j = {}; j['fields.' + i] = 1; return j;});
    idx.push({ 'wid': 1 });
    idx.push({ 'text': 'text' });
    idx.forEach(function(i) {
      coll.ensureIndex(i, { w: config.get('writeConcern')}, function(err, indexName) {
        console.log(kuler('Index field :', 'olive'), kuler(Object.keys(i)[0] + '/' + indexName, 'limegreen'));
      });
    });
  }

  //
  // Computer
  //
  var cptlock
    , cptopts = {
        "connexionURI" : config.get('connexionURI'),
        "collectionName": config.get('collectionName'),
        "concurrency" : config.get('concurrency')
      }
    , cpt = new Computer(config.get('corpusFields'), cptopts)
    ;

  if (config.get('turnoffComputer') === false) {
    cpt.use('count', require('./operators/count.js'));
    cpt.use('catalog', require('./operators/catalog.js'));
    cpt.use('distinct', require('./operators/distinct.js'));
    cpt.use('ventilate', require('./operators/ventilate.js'));
    cpt.use('total', require('./operators/total.js'));
    cpt.use('graph', require('./operators/graph.js'));
    cpt.use('groupby', require('./operators/groupby.js'));
    cpt.use('merge', require('./operators/merge.js'));
    hook('operators', config.get('hooks'))
    .from(viewPath, __dirname, config.get('hooksPath'))
    .over(config.get('operators'))
    .apply(function(hash, func) {
      cpt.use(hash, func);
    });
    var cptfunc = function(err, doc) {
      if (cptlock === undefined || cptlock === false) {
        cptlock = true;
        heart.onceOnBeat(2, function() {
          cptlock = false; // évite d'oublier un evenement pendant le calcul
          cpt.compute(function(err) {
            console.log(kuler('Corpus fields computed.', 'green'));
          });
        });
      }
    }
    ldr.on('watching', cptfunc);
    ldr.on('changed', cptfunc);
    ldr.on('cancelled', cptfunc);
    ldr.on('dropped', cptfunc);
    ldr.on('added', cptfunc);
  }


  var app = express();

  //
  // Middlewares :
  // add middlewares to Express
  //
  app.use(morgan(config.get('logFormat'), { stream : process.stderr }));

  hook('middlewares', config.get('hooks'))
  .from(viewPath, __dirname, config.get('hooksPath'))
  .over(config.get('middlewares'))
  .apply(function(hash, func) {
    app.use(hash, func(config));
  });

  if (config.get('turnoffRoutes') === false) {

    //
    // view template engine
    //
    var env = nunjucks.configure(viewPath, {
      autoescape: false,
      watch: false,
      express: app
    });

    // tags
    require('nunjucks-markdown').register(env, config.get('markdown'));

    // filters
    env.addFilter('nl2br', require('./filters/nl2br.js')(config));
    env.addFilter('hash', require('./filters/hash.js')(config));
    env.addFilter('stack', require('./filters/stack.js')(config));
    env.addFilter('flatten', require('./filters/flatten.js')(config));
    env.addFilter('add2Array', require('./filters/add2Array.js')(config));
    env.addFilter('objectPath', require('./filters/objectPath.js')(config));
    env.addFilter('markdown', require('./filters/markdown.js')(config.get('markdown')));
    hook('filters', config.get('hooks'))
    .from(viewPath, __dirname, config.get('hooksPath'))
    .over(config.get('filters'))
    .apply(function(hash, func) {
      env.addFilter(hash, func(config));
    });

    hook('filters', config.get('hooks'))
    .from(viewPath, __dirname, config.get('hooksPath'))
    .over(config.get('asynchronousFilters'))
    .apply(function(hash, func) {
      env.addFilter(hash, func(config), true);
    });


    //
    // add routes to send data on the Web
    //
    hook('routes', config.get('hooks'))
    .from(viewPath, __dirname, config.get('hooksPath'))
    .over(config.get('routes'))
    .apply(function(hash, func, item) {
      var method =  item.method || 'all';
      app.route(item.path || hash)[method](func(item.options || config));
    });
    app.route('/browse.:format').all(require('./routes/browse.js')(config));
    app.route('/corpus.:format').all(require('./routes/corpus.js')(config));
    if (config.get('turnoffComputer') === false) {
      app.route('/compute.:format').all(require('./routes/compute.js')(config, cpt));
    }
    app.route('/display/:doc.:format').all(require('./routes/display.js')(config));
    app.route('/dump/:doc.:format').all(require('./routes/dump.js')(config));
    app.route('/save/:doc').all(bodyParser.urlencoded({ extended: false })).post(require('./routes/save.js')(config));
    app.route('/config.js(on|)').all(function (req, res) { res.jsonp(config.expose()); });
    var modules = config.get('browserifyModules');

    if (Array.isArray(modules) && modules.length > 0) {
      app.get('/bundle.js', browserify(modules, {
        debug: false
      }));
    }
    /*
     if (config.get('turnoffUpload') === false) {
       var options = config.get('upload');
       options.tmpDir = config.get('tempPath');
       options.uploadDir = dataPath;
       // options.uploadUrl = '/uploaded/files/';
       options.storage = options.storage ? options.storage : {};
       options.imageVersions = {};
       options.storage.type = options.storage.type ? options.storage.type : 'local';
       var uploader = require('blueimp-file-upload-expressjs')(options);
       app.route('/upload').get(function (req, res) {
         uploader.get(req, res, function (obj) { res.json(obj); });
       }).post(function (req, res) {
         uploader.post(req, res, function (obj) { res.json(obj); });
       });
     }
     */
    if (config.get('turnoffWebdav') === false) {
      app.route('/webdav*').all(require('./helpers/webdav.js')({
        debug: config.get('debug')
      }));
    }
    app.route('/assets/*').all(require('ecstatic')({
      root : path.join(viewPath, 'assets'),
      baseDir : '/assets',
      cache         : 3600,
      showDir       : true,
      autoIndex     : true,
      humanReadable : true,
      si            : false,
      defaultExt    : 'html',
      gzip          : false
    }));

    app.route('/').all(function(req, res) { res.redirect('index.html'); });
    app.route('/:name.:format').all(require('./routes/serve.js')(config));

    app.use(function(req, res, next) {
      res.status(404).send('Not Found').end();
    });
  }
  else {
    app.use(function(req, res, next) {
      res.status(503).send('Service Unavailable').end();
    });
  }

  //
  // HTTP Server :
  // initialize the HTTP server and the "realtime" server
  //
  var server = require('http').createServer(app);

  if (config.get('turnoffPrimus') === false) {
    var Primus = require('primus');
    var primus = new Primus(server, {});

    primus.use('emitter', require('primus-emitter'));

    primus.on('connection', function (spark) {
      ldr.on('changed', function(err, doc) {
        if (!err) {
          debug('changed', err, doc);
          spark.send('changed', doc);
        }
      });
      ldr.on('cancelled', function(err, doc) {
        if (!err) {
          debug('cancelled', err, doc);
          spark.send('cancelled', doc);
        }
      });
      ldr.on('dropped', function(err, doc) {
        if (!err) {
          debug('dropped', err, doc);
          spark.send('dropped', doc);
        }
      });
      ldr.on('added', function(err, doc) {
        if (!err) {
          debug('added', err, doc);
          spark.send('added', doc);
        }
      });
    });
  }

  //
  // Listen :
  // get or find  a port number and launche the server.
  //
  portfinder.basePort = config.get('port');
  portfinder.getPort(function (err, newport) {
    if (err) {
      throw err;
    }
    config.set('port', newport);
    server.listen(newport, function() {
      console.log(kuler('Server is listening on port ' + server.address().port + '.', 'green'));
    });
  });

  return server;
}

module.exports = function(callback) {
  callback(config, serve);
};

if (!module.parent) {
  module.exports(function(cfg, srv) {
    srv();
  });
}
