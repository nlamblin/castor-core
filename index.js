/*jshint node:true, laxcomma:true*/
"use strict";

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , fs = require('fs')
  , pck = require('./package.json')
  , config = require('./config.js')
  , Filerake = require('filerake')
  , portfinder = require('portfinder')
  , sugar = require('sugar')
  , kuler = require('kuler')
  , express = require('express')
  , nunjucks = require('nunjucks')
  , morgan  = require('morgan')
  , browserify = require('browserify-middleware')
  , Primus = require('primus')
  , hook = require('./helpers/hook.js')
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
  config.set('connexionURI',      config.get('connexionURI') || 'mongodb://localhost:27017/castor/');
  config.set('port',              config.get('port') || '3000');
  config.set('logFormat',         config.get('logFormat') || 'combined');
  config.set('middlewareModules', config.get('middlewareModules') || {});
  config.set('upstreamModules',   config.get('upstreamModules') || {});
  config.set('downstreamModules', config.get('downstreamModules') || {});
  config.set('browserifyModules', config.get('browserifyModules') || []);
  config.set('userfields',        config.get('userfields') || {});


  console.log(kuler('Theme :', 'olive'), kuler(viewPath, 'limegreen'));

  //
  // Upstream :
  // add some statements when loading files to MongoDB
  //
  if (fs.existsSync(dataPath)) {
    console.log(kuler('Source :', 'olive'), kuler(dataPath, 'limegreen'));
    var FilerakeOptions = {
      "connexionURI" : config.get('connexionURI'),
      "concurrency" : require('os').cpus().length,
      "ignore" : [
        "**/.*", "*~", "*.sw?", "*.old", "*.bak", "**/node_modules"
      ]
    };
    var fr = new Filerake(dataPath, FilerakeOptions);
    fr.use('**/*', require('./upstream/initialize-tags.js')(config));
    // fr.use('**/*.xml', require('./upstream/convert-xml.js')(config));
    // fr.use('**/*.pdf', require('./upstream/append-yaml.js')());

    hook()
    .from(path.join(__dirname, 'upstream'))
    .over(config.get('upstreamModules'))
    .apply(function(hash, func) {
        fr.use(hash, func(config));
      }
    );
    fr.sync(function(err) {
        console.log(kuler('Files and Database are synchronised.', 'green'));
      }
    );
    config.set('collectionName', fr.options.collectionName);
  }


  //
  // Middlewares :
  // add middlewares to Express
  //
  var app = express();


  nunjucks.configure(viewPath, {
      autoescape: true,
      express: app
  });

  app.use(morgan(config.get('logFormat'), {
        stream : process.stderr
  }));

  hook()
  .from(path.join(__dirname, 'middlewares'))
  .over(config.get('middlewareModules'))
  .apply(function(hash, func) {
      app.use(hash, func(config));
    }
  );


  //
  // Downstream :
  // add routes to send data on the Web
  //
  hook()
  .from(path.join(__dirname, 'downstream'))
  .over(config.get('downstreamModules'))
  .apply(function(hash, func) {
      app.route(hash).all(func(config));
    }
  );

  app.route('/robots.txt').get(require('./downstream/inform-robots.js')(config));
  app.route('/sitemap.xml').get(require('./downstream/inform-searchengines.js')(config));
  app.route('/browse-docs.:format').all(require('./downstream/browse-docs.js')(config));
  app.route('/distinct-:field.:format').all(require('./downstream/distinct-field.js')(config));
  app.route('/ventilate-:fields.:format').all(require('./downstream/ventilate-fields.js')(config));
  app.route('/display-:doc.:format').all(require('./downstream/display-doc.js')(config));
  app.route('/index.:format').all(require('./downstream/overview-docs.js')(config));

  var modules = config.get('browserifyModules');

  if (Array.isArray(modules) && modules.length > 0) {
    app.get('/bundle.js', browserify(modules));
  }
  app.route('/webdav/*').all(require('./helpers/webdav.js')({
        debug: false
  }));
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

  app.use(function(req, res, next) {
      res.status(404).end()
  });

  //
  // HTTP Server :
  // initialize the HTTP server and the "realtime" server
  //
  var server = require('http').createServer(app)
    , primus = new Primus(server, {});

  primus.use('emitter', require('primus-emitter'));

  primus.on('connection', function (spark) {
      fr.on('changed', function(err, doc) {
          if (!err) {
          debug('changed', err, doc);
            spark.send('changed', doc);
          }
        }
      );
      fr.on('cancelled', function(err, doc) {
          if (!err) {
            debug('cancelled', err, doc);
            spark.send('cancelled', doc);
          }
        }
      );
      fr.on('dropped', function(err, doc) {
          if (!err) {
            debug('dropped', err, doc);
            spark.send('dropped', doc);
          }
        }
      );
      fr.on('added', function(err, doc) {
          if (!err) {
            debug('added', err, doc);
            spark.send('added', doc);
          }
        }
      );
    }
  );

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
    }
  );

  return server;
}

module.exports = function(callback) {
  callback(config, serve);
};

if (!module.parent) {
  module.exports(function(cfg, srv) {
      cfg.set('dataPath', path.normalize(path.resolve(__dirname, cfg.get('dataPath') || '')));
      srv();
    }
  );
}
