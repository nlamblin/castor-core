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
        done: function (error, data) {
          console.log('error', error);
          console.log('data.textStatus', data.textStatus);
          console.log('data.result', data.result);
          $('#modal-load-input-indicator').html('100%');
          setTimeout(function() { $('#modal-load-input-indicator').fadeOut(); }, 2500);
        },
        progressall: function (e, data) {
          var progress = parseInt(data.loaded / data.total * 100, 10);
          $('#modal-load-input-indicator').html(progress + '%');
        }
    });
    $('#modal-load-submit').click(function() {
        var formData = {
          loader : $("#modal-load-er").val(),
          text   : $('#modal-load-input-text').text(),
          files  : [],
          uri    : $("#modal-load-input-uri").val(),
          type   : $("#modal-load-tab-list li.active").data('type')
        }

        console.log('formData', formData);
        // $.post("/-/load", formData, function( res ) {
            // console.log( 'res', res); // John
        // }, "json");
    });





});

