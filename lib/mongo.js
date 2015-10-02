/*jshint node:true, laxcomma:true*/
"use strict";

var  pmongo = require("promised-mongo")
		,kuler  = require("kuler")
		,mongo  = {};

mongo.checkMongodb = function(database,close){
	database.stats()
  .then(function () {
    if(close){
    	database.close();
    }
  })
  .catch(function(e) {
    console.error(kuler("Unable to connect to MongoDB. Is it started ?", "red"));
    process.exit(1);
  });
};

mongo.connect = function(connectionURI){
	if(!mongo.db){
		//console.info("First connection to mongoDB");
		mongo.db = pmongo(connectionURI);
		mongo.checkMongodb(mongo.db , false);
	}
	return mongo.db;
};

module.exports = mongo;
