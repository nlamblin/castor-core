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
  , view = require('./helpers/view.js')
  , morgan  = require('morgan')
  , browserify = require('browserify-middleware')
  , Primus = require('primus')
  , hook = require('./helpers/hook.js')
  ;

function serve () {
  console.log(kuler('castor@' + pck.version, 'orange'));
  console.log(kuler('Theme :', 'olive'), kuler(view(), 'limegreen'));

  //
  // Data path :
  // Check and fix a data source directory
  //
  var dataPath = config.get('dataPath') ;

  var confile = path.normalize(dataPath) + '.json';
  if (fs.existsSync(confile)) {
    console.log(kuler('Load configuration file :', 'olive'), kuler(confile, 'limegreen'));
    config.load(confile);
  }
  config.set('dataPath', dataPath);


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
    .over(config.get('upstreamModules') || {})
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

  nunjucks.configure(view(), {
      autoescape: true,
      express: app
  });

  app.use(morgan(config.get('logFormat') || 'combined', {
        stream : process.stderr
  }));

  hook()
  .from(path.join(__dirname, 'middlewares'))
  .over(config.get('middlewareModules') || {})
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
  .over(config.get('downstreamModules') || {})
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
        root : view('assets'), baseDir : '/assets',
        cache         : 3600,
        showDir       : true,
        autoIndex     : true,
        humanReadable : true,
        si            : false,
        defaultExt    : 'html',
        gzip          : false
  }));

  app.route('/').all(function(req, res) { res.redirect('index.html') });

  app.use(function(req, res, next) {
      res.send(404);
  });

  //
  // HTTP Server :
  // initialize the HTTP server and the "realtime" server
  //
  var server = require('http').createServer(app)
    , primus = new Primus(server, {});

  primus
  .use('multiplex', 'primus-multiplex')
  .use('emitter', 'primus-emitter')
  .use('resource', 'primus-resource');

  primus.resource('docs', require('./resources/docs.js'));
  primus.resource('doc', require('./resources/doc.js'));

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
}

if (!module.parent) {
  module.exports(function(cfg, srv) {
      cfg.set('dataPath', path.normalize(path.resolve(__dirname, cfg.get('dataPath') || './data')));
      srv();
    }
  );
}
