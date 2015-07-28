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


    var fileToLoad = '';
    $('#modal-load-input-filename').change(function() {
        var t = $(this).val();
        $('#modal-load-input-file').val(t);
    });
    $('#modal-load-input-filename').fileupload({
        dataType: 'json',
        send:  function (e, data) {
          $('#modal-load-input-file-label').hide(4, function() {
              $('#modal-load-input-file-indicator').show().html('0%');
          });
        },
        done: function (error, data) {
           if (Array.isArray(data.result) && data.result[0]) {
             fileToLoad = data.result[0];
         }
          $('#modal-load-input-file-indicator').html('100%');
          $('#modal-load-tab-file > div').addClass("has-success has-feedback");
          $('#modal-load-tab-file .form-control-feedback').show();
          setTimeout(function() {
              $('#modal-load-input-file-indicator').hide(4, function() {
                  $('#modal-load-input-file-label').show();
              });
          }, 2500);
        },
        progressall: function (e, data) {
          var progress = parseInt(data.loaded / data.total * 100, 10);
          $('#modal-load-input-file-indicator').html(progress + '%');
        }
    });
    $('#modal-load-submit').click(function() {
        var formData = {
          loader : $("#modal-load-er").val(),
          text   : $('#modal-load-input-text').val(),
          file   : fileToLoad,
          uri    : $("#modal-load-input-uri").val(),
          type   : $("#modal-load-tab-list li.active").data('type')
        }
        console.log(formData);
        if (formData[formData.type] === undefined || formData[formData.type] === '') {
          return false;
        }
        $.post("/-/load", formData, function( res ) {
            console.log( 'res', res);
        }, "json");
        fileToLoad = '';
    });





});

