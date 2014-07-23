"use strict";

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , fs = require('fs')
  , pck = require('./package.json')
  , config = require('./config.js')
  , Filerake = require('filerake')
  , load = require('./helpers/load.js')
  , portfinder = require('portfinder')
  , sugar = require('sugar')
  , kuler = require('kuler')
  , express = require('express')
  , nunjucks = require('nunjucks')
  , view = require('./helpers/view.js')
  , browserify = require('browserify-middleware')
  , Primus = require('primus')
  ;

console.log(kuler('castor@' + pck.version, 'orange'));

//
// Setup data path
//
var dataPath = config.get('dataPath') ;
if (!dataPath) {
  dataPath = path.join(__dirname, 'data');
}
var confile = path.normalize(dataPath) + '.json';
if (fs.existsSync(confile)) {
  console.log(kuler('Load configuration file :', 'olive'), kuler(confile, 'limegreen'));
  config.load(confile);
}

config.set('dataPath', dataPath);

if (fs.existsSync(dataPath)) {
  console.log(kuler('Scan directory :', 'olive'), kuler(dataPath, 'limegreen'));
  var FilerakeOptions = {
    "connexionURI" : config.get('connexionURI'),
    "concurrency" : require('os').cpus().length,
    "ignore" : [
      "**/.*", "*~", "*.sw?", "*.old", "*.bak", "**/node_modules"
    ]
  };
  var fr = new Filerake(dataPath, FilerakeOptions);
  fr.use('**/*', require('./upstream/initialize-tags.js'));
  fr.use('**/*.xml', require('./upstream/convert-xml.js'));
  // fr.use('**/*.pdf', require('./upstream/append-yaml.js')());
  // load(optconf, 'middlewares', function (middleware) {
  // fr.use(middleware);
  // }
  // );
  fr.sync(function(err) {
      console.log(kuler('Files and Database are synchronised.', 'green'));
    }
  );

  config.set('collectionName', fr.options.collectionName);
}


//
// Setup Express
//
var app = express();


// Setup views
nunjucks.configure(view(), {
    autoescape: true,
    express: app
});

// Setup Middlewares
app.use(require('ecstatic')({
    root          : view('assets'),
    baseDir       : '/assets',
    cache         : 3600,
    showDir       : true,
    autoIndex     : true,
    humanReadable : true,
    si            : false,
    defaultExt    : 'html',
    gzip          : false
}));

// Setup routes
app.route('/bundle.js').get(browserify(['vue', 'jquery']));
app.route('/robots.txt').get(require('./downstream/inform-robots.js'));
app.route('/sitemap.xml').get(require('./downstream/inform-searchengines.js'));
app.route('/browse-docs.:format').all(require('./downstream/browse-docs.js'));
app.route('/distinct-:field.:format').all(require('./downstream/distinct-field.js'));
app.route('/ventilate-:fields.:format').all(require('./downstream/ventilate-fields.js'));
app.route('/display-:doc.:format').all(require('./downstream/display-doc.js'));
app.route('/index.:format').all(require('./downstream/overview-docs.js'));
app.route('/webdav/*').all(require('./helpers/webdav.js')({debug: false}));
app.route('/').all(function(req, res) { res.redirect('index.html') });


/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});





//
// Setup HTTP Server
//
var server = require('http').createServer(app)
  , primus = new Primus(server, {});

// Setup Primus
primus
.use('multiplex', 'primus-multiplex')
.use('emitter', 'primus-emitter')
.use('resource', 'primus-resource');

primus.resource('docs', require('./resources/docs.js'));
primus.resource('doc', require('./resources/doc.js'));

//
// Listen
//
portfinder.basePort = config.get('port');
portfinder.getPort(function (err, newport) {
    if (err) {
      throw err;
    }
    config.set('port', newport);
    server.listen(newport, function() {
        console.log(kuler('Express server listening on port', 'olive'), kuler(server.address().port,'limegreen'));
    });
  }
);


