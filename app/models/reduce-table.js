/*jshint node:true, laxcomma:true */
'use strict';

var path = require('path')
  , basename = path.basename(__filename, '.js')
  , debug = require('debug')('pollux:models:' + basename)
  , JBJ = require('jbj')
  ;

module.exports = function(model) {
  model
  .declare('selector', function(req, fill) {
      fill({
          "@id" : req.params.resourcename
      });
  })
  .append('doc', function(req, fill) {
      if (this.mongoHandle instanceof Error) {
        return fill();
      }
      this.mongoHandle.collection(req.config.get('collectionIndex')).findOne(this.selector).then(fill).catch(fill);;
  })
  .complete('value', function(req, fill) {
      debug('doc', this.doc);
      JBJ.render(this.doc.reducer, this.doc, function (err, res) {
          debug('res', res);
          if (err) {
            fill(err);
          }
          else {
            fill(res);
          }
      });
  })
  .send(function(res, next) {
      var self = this;
      res.set('Content-Type', 'application/json');
      res.json(this.value);
  });

  return model;
}



