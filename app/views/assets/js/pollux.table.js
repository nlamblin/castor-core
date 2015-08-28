/* global $, Vue, document, JSONEditor */
$(document).ready(function() {
    'use strict';
    Vue.config.debug = true;
    var oboe = require('oboe');
    var Faker = require('faker');


    var TableItemVue = new Vue( {
        el: '#table-items',
        data: {
          items: []
        },
        ready: function() {
          this.refreshData()
        },
        filters: {
          plusplus: function(input) {
            return input + 1;
          }
        },
        components: {
          cell : {
            props: [
              {
                name: 'get-item',
                type: Function,
                required: true
              },
              {
                name: 'index',
                type: Number,
                required: true
              },
              {
                name: 'name',
                type : String,
                required : true
            }
          ],
            computed: {
              value: function() {
                var item = this.getItem(this.index);
                return item[this.name];
              },
              title: function() {
                var item = this.getItem(this.index);
                return item['$'+this.name];
              },
              isResource: function () {
                var item = this.getItem(this.index);
                return item['$'+this.name] !== undefined ? true : false;
              },
              isLiteral: function () {
                var item = this.getItem(this.index);
                return item['$'+this.name] === '' || item['$'+this.name] === undefined  ? true : false;
              },
              isNull: function () {
                var item = this.getItem(this.index);
                return item[this.name] === null || item[this.name] === undefined  ? true : false;
              }
            },
            template : '<span v-if="isLiteral">((value))</span><a v-attr="href:value" v-if="isResource">((title))</a><span v-if="isNull">n/a</span>'
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
                $("#table-items table").resizableColumns();
            }) ;
          },
          onItem : function (i) {
            return this.items[i];
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
      $.ajax({
          type: "POST",
          url: "/-/load",
          data: formData,
          success: function(data) {
            document.location.href= document.location.pathname;
          }
      });
      fileToLoad = '';
  });

  $('#action-newtable').click(function() {
      var url = '/' + Faker.lorem.words(3).join('-') + '/';
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
  $('#action-newcolumn').click(function() {
      var url = document.location.pathname.replace(/\/+$/,'') + '/*/' + Faker.lorem.words(3).join('-') + '/';
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
        "previousType": "",
        "previousValue" : {},
        "previousName" : "",
        "previousLabel" : "",
        "previousComment" : "",
        "propertyScheme": "",
        "propertyType": "",
        "propertyValue" : {},
        "propertyName" : "",
        "propertyLabel" : "",
        "propertyComment" : ""
      },
      ready: function() {
        var JSONEditorOptions = { mode: "code" };
        var JSONEditorContainer = document.getElementById("modal-editcolumn-jsoneditor");
        this.JSONEditorHandle = new JSONEditor(JSONEditorContainer, JSONEditorOptions);
      },
      filters: {
      },
      methods: {
        setField: function (column) {
          var self = this;
          console.log('column', column);
          self.propertyLabel = column.propertyLabel;
          self.previousLabel = column.propertyLabel;
          self.propertyValue = column.propertyValue;
          self.previousValue = column.propertyValue;
          self.propertyName = column.propertyName;
          self.previousName = column.propertyName;
          self.propertyScheme = column.propertyScheme;
          self.previousScheme = column.propertyScheme;
          self.propertyType= column.propertyType;
          self.previousType = column.propertyType;
          self.propertyComment = column.propertyComment;
          self.previousComment = column.propertyComment;
          self.JSONEditorHandle.set(self.propertyValue);
        },
        drop: function() {
          console.log('Not yet implemted');
        },
        save : function() {
          this.propertyValue = this.JSONEditorHandle.get();
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
      return false;
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

