/* global $, Vue, document */
$(document).ready(function() {
    'use strict';
    var request = require('superagent');
    var TableItemVue = new Vue( {
        el: '#table-items',
        data: {
          count : 0,
          page : 1,
          pages : [],
          items: []
        },
        ready: function() {
          var self = this;
          this.refreshData()
        },
        filters: {
        },
        methods: {
          changeItem: function (e) {
            var self = this;
          },
          changePage: function (e) {
            this.page = Number($(e.target).text());
            this.refreshData();
          },
          firstPage: function (e) {
            this.page = 1;
            this.refreshData();
          },
          lastPage: function (e) {
            this.page = Number(this.pages.length);
            this.refreshData();
          },
          refreshData: function () {
            var self = this;
            self.pages = new Array(self.pages.length);
            self.pages[self.page - 1] = true;
            request
            .get(window.location.href + '.json')
            .query({})
            .end(function(res) {
                if (res.body.data) {
                  self.items = res.body.data;
                }
            });
          }
        }
      }
    );
});

