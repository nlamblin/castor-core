/*jshint node:true, laxcomma:true*/
"use strict";

var pmongo = require("promised-mongo"),
		mongo  = {};


mongo.checkMongodb = function(database,close){
	database.stats()
  .then(function () {
    if(close === true){
    	database.close();
    }
  })
  .catch(function(e) {
    console.info(kuler("Unable to connect to MongoDB. Is it started ?", "red"));
    process.exit(1);
  });
};

mongo.connect = function(connectionURI){
	if(!mongo.db){
		console.info("Création d'une connexion à mongo");
		mongo.db = pmongo(connectionURI);
		mongo.checkMongodb(mongo.db , false);
	}
	console.info("Envoie de la connexion crée");
	return mongo.db;
};

module.exports = mongo;