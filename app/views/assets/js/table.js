/* global $, Vue, document */
$(document).ready(function() {
    'use strict';
    var oboe = require('oboe');
    var TableItemVue = new Vue( {
        el: '#table-items',
        data: {
          items: []
        },
        ready: function() {
          var self = this;
          this.refreshData()
        },
        filters: {
        },
        methods: {
          refreshData: function () {
            var self = this;
            oboe(window.location.href + '.json')
            .node('!.*', function(chunk){
                console.log( chunk);
                return oboe.drop;

            }).done(function( all){
                console.log( all);
            })
            ;
          }
        }
      }
    );
});

