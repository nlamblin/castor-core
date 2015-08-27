/* global $, Vue, document, JSONEditor */
$(document).ready(function() {
    'use strict';
    Vue.config.debug = true;
    var oboe = require('oboe');
    var Faker = require('faker');

    var JSONEditorRawData = new JSONEditor(document.getElementById("modal-viewrawdata-jsoneditor"), {
        mode: "view"
    });


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
        components: {
          cell : {
            props: {
              name: {
                type : String,
                required : true
              },
              value: {
                default: ''
              },
              title: {
                default: ''
              }
            },
            computed: {
              isLink: function () {
                return this.title !== ''  ? true : false;
              },
              isLiteral: function () {
                return this.title === '' || this.title === undefined  ? true : false;
              },
              isNull: function () {
                return this.value === null || this.value === undefined  ? true : false;
              }


            },
            template : '<span v-if="isLiteral">((value))</span><a v-attr="href:value" v-if="isLink">((title))</a><span v-if="isNull">n/a</span>'
          }
        },
        methods: {
          refreshData: function () {
            var self = this;
            oboe(window.location.href.replace(/\/+$/,'') + '/*')
            .node('!.*', function(chunk){
                self.items.unshift(chunk);
                return oboe.drop;

            }).done(function(all){
                console.log( all);
            })
            ;
        },
        viewRawData : function(item) {
          console.log('item', item)
          JSONEditorRawData.set({item:'test'});
          $('#modal-viewrawdata').modal('toggle');
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

  $('#action-newtable').click(function() {
      document.location.href= "/" + Faker.lorem.words(1);
      return false;
  });
  $('#action-newcolumn').click(function() {
      var url = document.location.pathname.replace(/\/+$/,'') + '/*/' + Faker.lorem.words(5).join('-') + '/';
      console.log('url', url);
      $.ajax({
          type: "POST",
          url: url ,
          data: {},
          success: function(data) {
            document.location.href= document.location.pathname;
          }
      });
      return false;
  });


  var EditColumnVue = new Vue( {
      el: '#modal-editcolumn',
      data: {
        "previousScheme": "",
        "previousValue" : {},
        "previousName" : "",
        "previousLabel" : "",
        "propertyScheme": "",
        "propertyValue" : {},
        "propertyName" : "",
        "propertyLabel" : ""
      },
      ready: function() {
      },
      filters: {
      },
      methods: {
        setField: function (column) {
          console.log('column', column);
          var self = this;
          self.propertyLabel = column.propertyLabel;
          self.previousLabel = column.propertyLabel;
          self.propertyValue = column.propertyValue;
          self.previousValue = column.propertyValue;
          self.propertyName = column.propertyName;
          self.previousName = column.propertyName;
          self.propertyScheme = column['@id'];
          self.previousScheme = column['@id'];
        },
        drop: function() {
          console.log('Not yet implemted');
        },
        save : function() {
          var url = document.location.pathname.replace(/\/+$/,'') + '/*/' + this.propertyName + '/';
          $.ajax({
              type: "POST",
              url: url ,
              data: {
                "previousScheme": this.previousScheme,
                "previousValue" : this.previousValue,
                "previousName" : this.previousName,
                "previousLabel" : this.previousLabel,
                "propertyScheme": this.propertyScheme,
                "propertyValue" : this.propertyValue,
                "propertyName" : this.propertyName,
                "propertyLabel" : this.propertyLabel
              },
              success: function(data) {
                document.location.href= document.location.pathname;
              }
          });

        }
      }
    }
  );

  $('.action-editcolumn').click(function (e) {
      EditColumnVue.setField($(this).data("column"));
      $('#modal-editcolumn').modal('toggle');
  });
  $('#modal-editcolumn-action-save').click(function (e) {
      EditColumnVue.save($(this).data("field"));
      $('#modal-editcolumn').modal('hide');
      return false;
  });
  $('#modal-editcolumn-action-drop').click(function (e) {
      EditColumnVue.drop();
      $('#modal-editcolumn').modal('hide');
      return false;
  });


  /*
   $('#modal-editcolumn-input-scheme').typeahead({
       local: ['http://schema.org/url','http://schema.org/name','http://schema.org/description','http://schema.org/image']
   });
   */



});

