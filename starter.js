"use strict";
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
  , util = require('util')
  , minimist = require('minimist')
  , portfinder = require('portfinder')
  , kuler = require('kuler')
  , os = require('os')
  , fs = require('fs')
  , app = require('./app')
  ;

module.exports = function(warmup) {

  var argv = minimist(process.argv.slice(2), {
      alias: {
        n: 'dry-run',
        h: 'help',
        V: 'version',
        v: 'verbose',
        d: 'debug'
      },
      boolean: ['help', 'version', 'verbose', 'debug', 'dry-run']
  });

  var appname = path.basename(process.argv[1])
  var usage = [
    "Usage: " + appname  + " [options...] <path>",
    "",
    "Options:",
    "\t -h, --help          Show usage and exit",
    "\t -n, --dry-run       Show config and exit",
    "\t -v, --verbose       Make the operation more talkative",
    "\t -V, --version       Show version number and quit",
    "",
    "It will look in all the obvious places to set the configuration:",
    " - command line arguments",
    " - environment variables prefixed with " + appname + "_",
    " - if you passed an option --config file then from that file",
    " - a local ." + appname + "rc or the first found looking in ./ ../ ../../ ../../../ etc.",
    " - $HOME/." + appname + "rc",
    " - $HOME/." + appname + "/config",
    " - $HOME/.config/" + appname + "",
    " - $HOME/.config/" + appname + "/config",
    " - /etc/" + appname + "rc",
    " - /etc/" + appname + "/config",
  ].join("\n");


    if (argv.help) {
      console.info(usage)
      process.exit(0);
    }

    if (argv.version) {
      console.info(require('./package.json').version);
      process.exit(0);
    }

    if (!argv.verbose) {
      console.log = require('debug')('console:log');
    }

    //
    // Default config parameters
    //
    var Configurator = require('./configurator.js');
    var config = new Configurator();
    config.fix('connectionURI',        'mongodb://localhost:27017/' + appname);
    config.fix('connexionURI',         config.get('connectionURI'));
    config.fix('collectionsIndexName', 'px_index');
    config.fix('collectionName',       'hotfolder');
    config.fix('debug',                false);
    config.fix('trustProxy',           false);
    config.fix('port',                 '3000');
    config.fix('logFormat',            'combined');
    config.fix('title',                'Change title');
    config.fix('description',          'Change description');
    config.fix('itemsPerPage',         30);
    config.fix('concurrency',          os.cpus().length);
    config.fix('writeConcern',         1);
    config.fix('rootURL',              undefined);
    config.fix('loginURL',            '/login.html');
    config.fix('delay',                250);
    config.fix('prefixURL',            ''); // ex: /server1
    config.fix('prefixKEY',            'ark:/XXX');
    config.fix('maxFileSize',          10485760); // 10 Mo
    config.fix('acceptFileTypes',      []);
    config.fix('heartrate',            5000);
    config.fix('filesToIgnore',        [ "**/.*", "~*", "*~", "*.sw?", "*.old", "*.bak", "**/node_modules", "Thumbs.db" ]);
    config.fix('tempPath',             os.tmpdir());
    config.fix('dataPath',             path.normalize(path.resolve(process.cwd(), path.normalize(argv._.pop() || "./data"))));
    config.fix('viewPath',             path.resolve(__dirname, './app/views/'));
    config.fix('middlewares',          {});
    config.fix('authorizations',       []);
    config.fix('strategies',           []);
    config.fix('models',               {});
    config.fix('markdown',             undefined);
    config.fix('filters',              []);
    config.fix('routes',               {});
    config.fix('loaders',              {});
    config.fix('middlewares',          []);
    config.fix('resources',            {}); // for apiv1
    config.fix('operators',            {});
    config.fix('browserifyModules',    []);
    config.fix('corpusFields',         {});
    config.fix('documentFields',       {});

    config.load(appname, argv);


    if (!fs.existsSync(config.get('dataPath'))) {
      console.info(usage)
      process.exit(1);
    }

    portfinder.basePort = config.get('port');
    portfinder.getPort(function (err, newport) {
        if (err instanceof Error) {
          console.error(kuler("Unable to get a free port. Try to stop some services.", "red"));
          process.exit(2);
        }
        else {
          config.set('port', newport);
          warmup(config, function(online) {
              //
              // Load conf file attached to dataPath
              //
              var dateConfig;
              try {
                var confile = path.normalize(config.get('dataPath')) + '.json';
                if (fs.existsSync(confile)) {
                  console.info(kuler('Load configuration file.', 'olive'), kuler(confile, 'limegreen'));
                  config.merge(require(confile));
                  config.set('dateConfig', fs.statSync(confile).mtime);
                }
              }
              catch(e) {
                return online(e);
              }

              if (!config.has('baseURL')) {
                config.set('baseURL', 'http://127.0.0.1:' + config.get('port'));
              }

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
                  if (argv['dry-run']) {
                    console.info(String(' ').concat(util.inspect(config.config, { showHidden: false, depth: null, colors: true }).slice(1, -1).replace(/,\n/g, "\n").replace(/(\s\s\w+:) /g, "$1\t")));
                    server.close(function() {
                        console.info(kuler('Server is not started.', 'olive'),  kuler(config.get('baseURL') + "/", "limegreen"));
                        process.exit(0);
                    });
                  }
                  else {
                    console.info(kuler('Server is listening.', 'olive'),  kuler(config.get('baseURL') + "/", "limegreen"));
                  }
                }
              }
              app(config, online);


          })
        }
    });
  }

