/*jshint node:true, laxcomma:true*/
"use strict";

var pmongo = require("promised-mongo"),
		mongo  = {};


mongo.checkMongodb = function(database){
	database.stats()
  .then(function () {
    db.close();
  })
  .catch(function(e) {
    console.info(kuler('Unable to connect to MongoDB. Is it started ?', 'red'));
    process.exit(1);
  });
};

mongo.connect = function(connectionURI){
	if(!mongo.db){
		mongo.db = pmongo(connectionURI);
		mongo.checkMongodb(mongo.db);
	}
	return mongo.db;
};

module.exports = mongo;