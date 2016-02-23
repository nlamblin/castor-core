/*jshint node:true, laxcomma:true*/
"use strict";

// for all which not use debug
console.log = require('debug')('console:log');

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , fs = require('fs')
  , os = require('os')
  , pck = require('./package.json')
  , config = require('./config.js')
  , Loader = require('castor-load')
  , Computer = require('./lib/compute.js')
  , portfinder = require('portfinder')
  , kuler = require('kuler')
  , express = require('express')
  , nunjucks = require('nunjucks')
  , morgan  = require('morgan')
  , browserify = require('browserify-middleware')
  , hook = require('./helpers/hook.js')
  , bodyParser = require('body-parser')
  , pmongo = require('promised-mongo')
  , extend = require('extend')
  , readline = require('readline')
  , db = require("./lib/mongo.js") 
  ;

  //
  // Fix required config parameters
  //
  config.fix('connectionURI',        config.get('connexionURI') || 'mongodb://localhost:27017/castor');
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
  config.fix('resources',            {});
  config.fix('operators',            {});
  config.fix('loaders',              []);
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
  config.fix('turnoffResources',     false);
  config.fix('turnoffUpload',        false);
  config.fix('filesToIgnore',        [ "**/.*", "~*", "*~", "*.sw?", "*.old", "*.bak", "**/node_modules", "Thumbs.db" ]);
  config.fix('tempPath',             os.tmpdir());
  config.fix('documentFields',       {});
  config.fix('corpusFields',         {});
  // config.fix('upload',               {});
  // config.fix('files:csv:separator', undefined); // auto
  // config.fix('files:csv:encoding', 'utf8');

// (function checkMongodb() {
//   var db = pmongo(config.get('connectionURI'));
//   db.stats()
//   .then(function () {
//     db.close();
//   })
//   .catch(function(e) {
//     console.info(kuler('Unable to connect to MongoDB. Is it started ?', 'red'));
//     process.exit(1);
//   });
// })();

var development = process.env.NODE_ENV !== 'production';

function serve () {


  console.info(kuler('Core version :', 'olive'), kuler(pck.version, 'limegreen'));

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
    console.info(kuler('Configuration :', 'olive'), kuler(confile, 'limegreen'));
    config.load(confile);
    dateConfig = fs.statSync(confile).mtime;
  }

  //
  // Load file :
  // Compute load log file name. It would be removed at next synchronization
  //
  function removeFile (file, cb) {
    fs.exists(file, function removeExistingFile (exists) {
      if (exists) {
        fs.unlink(file, cb);
      }
    });
  }
  var loadLogFile   = path.normalize(dataPath) + '_load.log';
  var errorsLogFile = path.normalize(dataPath) + '_errors.log';
  //
  // View path :
  // Find and Check the directory's templates
  //
  var viewPath = require('./helpers/view.js')(config);

  //
  // Deduct some config parameters
  //
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


  console.info(kuler('Theme :', 'olive'), kuler(viewPath, 'limegreen'));
  //
  // add some statements when loading files to MongoDB
  //
  var ldropts = {
    "connexionURI" : config.get('connectionURI'),
    "collectionName": config.get('collectionName'),
    "concurrency" : config.get('concurrency'),
    "delay" : config.get('delay'),
    "maxFileSize" : config.get('maxFileSize'),
    "writeConcern" : config.get('writeConcern'),
    "ignore" : config.get('filesToIgnore'),
    "dateConfig" : dateConfig
  }, ldr = new Loader(dataPath, ldropts);

  if (fs.existsSync(dataPath)) {
    var themePack = config.get('package');
    if (themePack) {
      console.info(kuler('App    :', 'olive'), kuler(themePack.name + ' ' + themePack.version, 'limegreen'));
    }
    console.info(kuler('Source :', 'olive'), kuler(dataPath, 'limegreen'));
    ldr.use('**/*', require('./loaders/prepend.js')());
    hook('loaders', config.get('hooks'))
    .from(viewPath, __dirname, config.get('hooksPath'))
    .over(config.get('loaders'))
    .apply(function(hash, func, item) {
      ldr.use(item.pattern || '**/*', func(item.options , config));
    });
    ldr.use('**/*', require('./loaders/document.js')({
      stylesheet: config.get('documentFields')
    }));
    ldr.use('**/*', require('./loaders/append.js')());
    if (config.get('turnoffSync') === false) {
      ldr.sync(function(err) {
          if (development) {
            process.stdout.write("\n");
          }
          if (err instanceof Error) {
            console.error(kuler(err.message, 'red'));
          }
          else {
            if (development) {
              // moveCursor below last display
              var nbFiles = Object.keys(nbSavedByFile).length;
              readline.moveCursor(process.stdout, 0, nbFiles - onSaved.previousFileNb - 1);
              readline.cursorTo(process.stdout, 0);
              process.stdout.write('\n');
            }
            var nbSaved = 0;
            for(var filename in nbSavedByFile) {
              nbSaved += nbSavedByFile[filename];
            }
            console.info(kuler('Files and Database are synchronised. (' + nbSaved + ' saved documents)' , 'green'));

            var loadLog = "";
            for (filename in nbSavedByFile) {
              loadLog += filename + " : " + nbSavedByFile[filename] + "\n";
            }
            loadLog += "Total    : " + nbSaved + " documents\n";
            loadLog += Date() + "\n";
            loadLog += "---------------------------------\n";
            fs.appendFile(loadLogFile, loadLog);
          }
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
    var coll = db.connect(config.get('connectionURI')).collection(config.get('collectionName'))
      , usfs = config.get('documentFields')
      , idx = Object.keys(usfs)
              .filter(function(i) { return (i !== '$text') && (usfs[i].noindex !== true); })
              .map(function(i) {var j = {}; j[i.replace('$','')] = 1; return j;});
    idx.push({ 'wid': 1 });
    idx.push({ 'text': 'text' });
    idx.forEach(function(i) {
        coll.ensureIndex(i, { w: config.get('writeConcern')}, function(err, indexName) {
            if (err instanceof Error) {
              console.error(kuler(err.message, 'red'));
            }
            else {
              console.info(kuler('Index field :', 'olive'), kuler(Object.keys(i)[0] + '/' + indexName, 'limegreen'));
            }
      });
    });
  }

  //
  // Computer
  //
  var cptlock
    , cptopts = {
        "port": config.get('port'),
        "connectionURI" : config.get('connectionURI'),
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
    ldr.on('browseOver', function (found) {
      nbSavedByFile = {};
      onSaved.previousFileNb = 0;
      removeFile(loadLogFile);
      removeFile(errorsLogFile);
    });
    var onSaved = function onSaved(doc) {
      if (nbSavedByFile[doc.filename]) {
        nbSavedByFile[doc.filename] = nbSavedByFile[doc.filename]+1;
      }
      else {
        nbSavedByFile[doc.filename] = 1;
      }
      // if (development && 0 === nbSavedByFile[doc.filename] % 10) {
      if (development) {
        if (nbSavedByFile[doc.filename] === 1) {
          process.stdout.write('\n');
        }
        var files = Object.keys(nbSavedByFile);
        var fileNb = files.indexOf(doc.filename);
        var moveY = fileNb - onSaved.previousFileNb;
        readline.moveCursor(process.stdout, 0, moveY);
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(kuler('Saved from : ', 'olive') +
          kuler(doc.filename.substr(1) + ': ', 'limegreen') +
          nbSavedByFile[doc.filename]);
        onSaved.previousFileNb = fileNb;
      }
    };
    var nbSavedByFile = {};
    onSaved.previousFileNb = 0;
    ldr.on('saved', onSaved);
    ldr.on('loadError', function (err, location, number) {
      if (development) {
        console.error('\n' +
          kuler('Error : ' + err, 'red'),
          'in file', kuler(location, 'red'),
          'document #'+ kuler(number,'red'));
      }
      fs.appendFile(errorsLogFile, location+" #"+number+": "+err+"\n");
    });
  }

  //
  // Resources
  //
  var rsclock
    , rscopts = {
        "connectionURI" : config.get('connectionURI'),
        "collectionName": config.get('collectionName'),
        "concurrency"   : config.get('concurrency')
      }
    , resources = config.get('resources')
    , corpusHandles = {}
    ;

  if (config.get('turnoffResources') === false) {
    Object.keys(resources).forEach(function(rid) {
      var options = {};
      extend(true, options, rscopts);
      options.collectionName = options.collectionName + '_resources_' + rid;
      console.info(kuler('Resource :', 'olive'), kuler(rid, 'limegreen'));
      corpusHandles[rid] = new Loader('/dev/null', options);
      hook('loaders', config.get('hooks'))
      .from(viewPath, __dirname, config.get('hooksPath'))
      .over(config.get('loaders'))
      .apply(function(hash, func, item) {
        corpusHandles[rid].use(item.pattern || '**/*', func(item.options, config));
      });

      if (resources[rid].url ) {
        if (Array.isArray(resources[rid].url)) {
          resources[rid].url.forEach(function(c) {
            corpusHandles[rid].push(c);
          });
        }
      }
    });
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
  .apply(function(hash, func, item) {
    app.use(item.path || hash, func(item.options || config, config));
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
    app.route('/-/v2/browse.:format').all(require('./routes/browse.js')(config));
    app.route('/corpus.:format').all(require('./routes/corpus.js')(config));
    if (config.get('turnoffComputer') === false) {
      app.route('/compute.:format').all(require('./routes/compute.js')(config, cpt));
      app.route('/-/v2/compute.:format').all(require('./routes/compute.js')(config, cpt));
    }
    app.route('/display/:doc.:format').all(require('./routes/display.js')(config));
    app.route('/-/v2/display/:doc.:format').all(require('./routes/display.js')(config));
    app.route('/dump/:doc.:format').all(require('./routes/dump.js')(config));
    app.route('/save/:doc').all(bodyParser.urlencoded({ extended: false })).post(require('./routes/save.js')(config));
    app.route('/drop/:doc').all(bodyParser.urlencoded({ extended: false })).post(require('./routes/drop.js')(config));
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

  server.listen(config.get('port'), function() {
    console.info(kuler('Server is listening on port ' + server.address().port + ': http://localhost:' + server.address().port, 'green'));
  });

  return server;
}

module.exports = function(callback) {
  portfinder.basePort = config.get('port');
  portfinder.getPort(function (err, newport) {
    if (err instanceof Error) {
      console.error(kuler(err.message, 'red'));
    }
    else {
      config.set('port', newport);
      callback(config, serve);
    }
  });
};

if (!module.parent) {
  module.exports(function(cfg, srv) {
    srv();
  });
}
