"use strict";
var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('castor:' + basename)
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
        h: 'help',
        V: 'version',
        v: 'verbose',
        d: 'debug'
      },
      boolean: ['help', 'version', 'verbose', 'debug']
  });

  var usage = [
    "Usage: " + path.basename(process.argv[1]) + " [options...] <path>",
    "",
    "Options:",
    "\t -v, --verbose       Make the operation more talkative",
    "\t -V, --version       Show version number and quit",
    ""
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
  config.fix('connectionURI',        'mongodb://localhost:27017/castor/');
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
  config.fix('rootURL',             "index");
  config.fix('delay',                250);
  config.fix('prefixURL',            ''); // ex: /1234
  config.fix('maxFileSize',          10485760); // 10 Mo
  config.fix('heartrate',            5000);
  config.fix('filesToIgnore',        [ "**/.*", "~*", "*~", "*.sw?", "*.old", "*.bak", "**/node_modules", "Thumbs.db" ]);
  config.fix('tempPath',             os.tmpdir());
  config.fix('dataPath',             path.normalize(path.resolve(process.cwd(), path.normalize(argv._[0] || "./data"))));
  config.fix('viewPath',             path.resolve(__dirname, './app/views/'));
  config.fix('middlewares',          {});
  config.fix('models',               {});
  config.fix('markdown',             undefined);
  config.fix('filters',              {});
  config.fix('asynchronousFilters',  {});
  config.fix('routes',               {});
  config.fix('loaders',              {});
  config.fix('middlewares',          []);
  config.fix('resources',            {}); // for apiv1
  config.fix('operators',            {});
  config.fix('browserifyModules',    []);
  config.fix('corpusFields',         {});
  config.fix('documentFields',       {});
  config.load('pollux', argv);


  if (!fs.existsSync(config.get('dataPath')) || !argv._[0]) {
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
        warmup(config, function(takeoff) {
            if (!config.has('baseURL')) {
              config.set('baseURL', 'http://127.0.0.1:' + config.get('port'));
            }
            config.set('Errors', require('./app/helpers/errors.js'));
            app(config, takeoff);
        })
      }
  });
}

