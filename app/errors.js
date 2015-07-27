/*jshint node:true, laxcomma:true*/
"use strict";

module.exports.IndexNotFound = require('custom-error')('IndexNotFound');
module.exports.TableNotFound = require('custom-error')('TableNotFound');
module.exports.InvalidParameters = require('custom-error')('InvalidParameters');

