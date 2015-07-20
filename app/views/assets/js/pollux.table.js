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
          this.refreshData()
        },
        filters: {
        },
        methods: {
          refreshData: function () {
            var self = this;
            oboe(window.location.href + '.json')
            .node('!.*', function(chunk){
                self.items.unshift(chunk);
                return oboe.drop;

            }).done(function(all){
                console.log( all);
            })
            ;
          }
        }
      }
    );


    $('#modal-load-input-filename').change(function() {
        var t = $(this).val();
        $('#modal-load-input-file').val(t);
    });
    $('#modal-load-input-filename').fileupload({
        dataType: 'json',
        send:  function (e, data) {
          $('#modal-load-input-indicator').show().html('Loading ... ');
        },
        done: function (e, data) {
          $('#modal-load-input-indicator').html('Loading ... 100%');
          setTimeout(function() { $('#modal-load-input-indicator').fadeOut(); }, 2500);
        },
        progressall: function (e, data) {
          var progress = parseInt(data.loaded / data.total * 100, 10);
          $('#modal-load-input-indicator').html('Loading ... '+progress + '%');
        }
    });





});

