/*jshint node:true, laxcomma:true*/
"use strict";

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , fs = require('fs')
  , pck = require('./package.json')
  , config = require('./config.js')
  , Loader = require('castor-load')
  , portfinder = require('portfinder')
  , sugar = require('sugar')
  , kuler = require('kuler')
  , express = require('express')
  , nunjucks = require('nunjucks')
  , morgan  = require('morgan')
  , browserify = require('browserify-middleware')
  , Primus = require('primus')
  , hook = require('./helpers/hook.js')
  , bodyParser = require('body-parser')
  ;

function serve () {

  console.log(kuler('castor@' + pck.version, 'orange'));

  //
  // Data path :
  // Check and fix a data source directory
  //
  var dataPath = config.get('dataPath') ;

  debug('dataPath', dataPath);

  var confile = path.normalize(dataPath) + '.json';
  if (fs.existsSync(confile)) {
    console.log(kuler('Configuration :', 'olive'), kuler(confile, 'limegreen'));
    config.load(confile);
  }
  config.set('dataPath', dataPath);

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
  config.fix('port',                 '3000');
  config.fix('logFormat',            'combined');
  config.fix('title',                'Castor');
  config.fix('description',          '');
  config.fix('theme',                'default');
  config.fix('middlewares',          {});
  config.fix('filters',              {});
  config.fix('asynchronousFilters',  {});
  config.fix('operators',            {});
  config.fix('loaders',              {});
  config.fix('routes',               {});
  config.fix('browserifyModules',    []);
  config.fix('userfields',           {});
  config.fix('itemsPerPage',         30);
  config.fix('concurrency',          require('os').cpus().length);
  config.fix('turnoffAll',           false);
  config.fix('turnoffSync',          false);
  config.fix('turnoffPrimus',        false);
  config.fix('turnoffRoutes',        false);
  config.fix('turnoffWebdav',        false);
  config.fix('filesToIgnore',        [ "**/.*", "~*", "*~", "*.sw?", "*.old", "*.bak", "**/node_modules" ]);
  config.fix('multivaluedFields',    []);
  config.fix('multivaluedSeparator', undefined); // auto
  config.fix('loader:csv:separator',undefined); // auto
  config.fix('loader:csv:encoding', 'utf8');

  if (config.get('turnoffAll') === true) {
    config.set('turnoffSync', true);
    config.set('turnoffPrimus', true);
    config.set('turnoffRoutes', true);
    config.set('turnoffWebdav', true);
  }

  console.log(kuler('Theme :', 'olive'), kuler(viewPath, 'limegreen'));

  //
  // add some statements when loading files to MongoDB
  //
  if (fs.existsSync(dataPath)) {
    console.log(kuler('Source :', 'olive'), kuler(dataPath, 'limegreen'));
    var opts = {
      "connexionURI" : config.get('connexionURI'),
      "collectionName": config.get('collectionName'),
      "concurrency" : config.get('concurrency'),
      "ignore" : config.get('filesToIgnore')
    };
    var fr = new Loader(dataPath, opts);
    fr.use('**/*', require('./loaders/initialize-tags.js')(config));
    fr.use('**/*.csv', require('castor-load-csv')(config.get('loader:csv')));
    fr.use('**/*.xml', require('castor-load-xml')(config.get('loader:xml')));
    // fr.use('**/*.pdf', require('./loaders/append-yaml.js')());
    hook('loaders')
    .from(viewPath, __dirname)
    .over(config.get('loaders'))
    .apply(function(hash, func) {
      fr.use(hash, func(config.get('loaders:' + hash)));
    });
    fr.use('**/*', require('./loaders/split-fields.js')(config));
    fr.use('**/*', require('./loaders/set-userfields.js')(config));
    if (config.get('turnoffSync') === false) {
      fr.sync(function(err) {
        console.log(kuler('Files and Database are synchronised.', 'green'));
      });
    }
    config.set('collectionName', fr.options.collectionName);
  }


  var ops = require('./helpers/operators.js');
  ops.use('distinct', require('./operators/distinct.js'));
  ops.use('ventilate', require('./operators/ventilate.js'));
  hook('operators')
  .from(viewPath, __dirname)
  .over(config.get('operators'))
  .apply(function(hash, func) {
    ops.use(hash, func);
  });




  //
  // Middlewares :
  // add middlewares to Express
  //
  var app = express();


  var env = nunjucks.configure(viewPath, {
    autoescape: true,
    express: app
  });
  env.addFilter('nl2br', require('./filters/nl2br.js')(config));
  env.addFilter('hash', require('./filters/hash.js')(config));
  env.addFilter('stack', require('./filters/stack.js')(config));

  hook('filters')
  .from(viewPath, __dirname)
  .over(config.get('filters'))
  .apply(function(hash, func) {
    env.addFilter(hash, func(config));
  });

  hook('filters')
  .from(viewPath, __dirname)
  .over(config.get('asynchronousFilters'))
  .apply(function(hash, func) {
    env.addFilter(hash, func(config), true);
  });


  app.use(morgan(config.get('logFormat'), {
    stream : process.stderr
  }));

  hook('middlewares')
  .from(viewPath, __dirname)
  .over(config.get('middlewares'))
  .apply(function(hash, func) {
    app.use(hash, func(config));
  });

  if (config.get('turnoffRoutes') === false) {

    //
    // add routes to send data on the Web
    //
    hook('routes')
    .from(viewPath, __dirname)
    .over(config.get('routes'))
    .apply(function(hash, func) {
      app.route(hash).all(func(config));
    });

    app.route('/robots.txt').get(require('./routes/inform-robots.js')(config));
    app.route('/sitemap.xml').get(require('./routes/inform-searchengines.js')(config));
    app.route('/browse.:format').all(require('./routes/browse-docs.js')(config));
    app.route('/distinct.:format').all(require('./routes/distinct-field.js')(config));
    app.route('/compute.:format').all(require('./routes/compute.js')(config));
    app.route('/ventilate.:format').all(require('./routes/ventilate-fields.js')(config));
    app.route('/display/:doc.:format').all(require('./routes/display-doc.js')(config));
    app.route('/save/:doc').all(bodyParser.urlencoded({ extended: false })).post(require('./routes/save-doc.js')(config));
    app.route('/export.:format').all(require('./routes/export-docs.js')(config));
    // app.route('/export/:doc.:format').all(require('./routes/export-doc.js')(config));
    app.route('/dashboard.:format').all(require('./routes/dashboard-docs.js')(config));
    app.route('/index.:format').all(require('./routes/overview-docs.js')(config));

    var modules = config.get('browserifyModules');

    if (Array.isArray(modules) && modules.length > 0) {
      app.get('/bundle.js', browserify(modules));
    }
    if (config.get('turnoffWebdav') === false) {
      app.route('/webdav/*').all(require('./helpers/webdav.js')({
        debug: false
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

    app.route('/*.html').all(require('ecstatic')({
      root : viewPath,
      baseDir : '/',
      cache         : 3600,
      showDir       : false,
      autoIndex     : false,
      humanReadable : true,
      defaultExt    : 'html',
      gzip          : false
    }));


    app.route('/').all(function(req, res) { res.redirect('index.html'); });

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
    var primus = new Primus(server, {});

    primus.use('emitter', require('primus-emitter'));

    primus.on('connection', function (spark) {
      fr.on('changed', function(err, doc) {
        if (!err) {
          debug('changed', err, doc);
          spark.send('changed', doc);
        }
      });
      fr.on('cancelled', function(err, doc) {
        if (!err) {
          debug('cancelled', err, doc);
          spark.send('cancelled', doc);
        }
      });
      fr.on('dropped', function(err, doc) {
        if (!err) {
          debug('dropped', err, doc);
          spark.send('dropped', doc);
        }
      });
      fr.on('added', function(err, doc) {
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
    cfg.set('dataPath', path.normalize(path.resolve(__dirname, cfg.get('dataPath') || '')));
    srv();
  });
}
