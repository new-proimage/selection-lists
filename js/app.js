(function () {

  'use strict';
  window.NPG = Ember.Application.create({
    allItems: [
      {
        index: 1,
        val: 'apples'
      },
      {
        index: 2,
        val: 'oranges'
      },
      {
        index: 3,
        val: 'peaches'
      },
      {
        index: 4,
        val: 'strawberries'
      },
      {
        index: 5,
        val: 'plums'
      }
    ],
    chosenItems: [
      {
        index: 1,
        val: 'apples'
      },
      {
        index: 2,
        val: 'oranges'
      }
    ]
  });

  // Make override for the sake of hosting controller demonstration
  NPG.ApplicationController = Ember.Controller.extend({
    actions: {
      chosenItemChanged: function(selected, all) {
        console.log('swapping occurred');
      }
    }
  });

  var SelectionMixin = Ember.Mixin.create({
    init: function () {
      this.get(this.get('itemClassName')).reopen({
        classNameBindings: ['isSelected:selected'],
        isSelected: false,
        click: function (ev) {
          this.get('parentView').handleSelection(ev, this);
          return false;
        }
      });
      this.set('selected', Ember.A([]));

      return this._super();
    },

    itemClassName: 'itemViewClass',
    addSelected: function (itemView) {
      if (this.get('selected').indexOf(itemView) === -1) {
        itemView.set('isSelected', true);
        this.get('selected').pushObject(itemView);
      }
    },
    clearSelection: function () {
      var item;
      while (this.get('selected.length') !== 0) {
        item = this.get('selected').popObject();
        item.set('isSelected', false);
      }
    },
    handleSelection: function (ev, itemView) {
      // if non of the ctrl, meta, and shift keys
      // are pressed, clear the selection
      if (!ev.ctrlKey && !ev.metaKey && !ev.shiftKey) {
        this.clearSelection();
      }

      // if selection is performed with shift key
      // the selected items should be between the last
      // and currently clicked items
      if (ev.shiftKey) {
        var lastSelected = this.get('selected.lastObject'),
            lastSelectedIndex = this.get('content').indexOf(lastSelected.get('content')),
            itemViewIndex = this.get('content').indexOf(itemView.get('content')),
            minIndex = Math.min(lastSelectedIndex, itemViewIndex),
            maxIndex = Math.max(lastSelectedIndex, itemViewIndex),
            childViews = this.get('childViews');
        this.clearSelection();
        for (var i = minIndex; i <= maxIndex; i += 1) {
          this.addSelected(childViews[i]);
        }
      }

      this.addSelected(itemView);
    },
    click: function () {
      this.clearSelection();
    },
    keyPress: function (ev) {
      if (ev.keyCode === 65 && ev.shiftKey) {
        this.get('childViews').forEach(function (itemView) {
          this.addSelected(itemView);
        }, this);
      }
    }

  });

  NPG.SelectionListsComponent = Ember.Component.extend({

    init: function () {
      var that = this;
      that.columnB = Ember.ArrayController.create({
        sortProperties: (that.sortProperties) ? that.sortProperties.split(',') : void 0,
        sortAscending: true,
        content: that.get('chosenItems')
      });
      that.columnA = Ember.ArrayController.create({
        sortProperties: (that.sortProperties) ? that.sortProperties.split(',') : void 0,
        sortAscending: true,
        content: (function () {
          var columnB = that.get('columnB'),
            availableItems = that.get('availableItems');

          return availableItems.filter(function (available) {
            return !columnB.find(function (item) {
              return JSON.stringify(item) === JSON.stringify(available);
            }, available);
          });
        })()
      });
      return this._super();
    },

    classNames: ['selection-lists'],

    /**
     * Implements swap of the element from
     * column A to column B or vice versa
     * @param {string}  target          Panel name of target
     * @param {string}  destination     Panel name of destination
     * @param {array}   indexes         Index of element in target panel
     */
    swap: function (target, destination, items) {
      var targetColumn = this.get(target),
          destColumn = this.get(destination);
      items.forEach(function (i) {
        var item = targetColumn.find(function (x) {
          return JSON.stringify(x) === JSON.stringify(i);
        });
        destColumn.pushObject(item);
        targetColumn.removeObject(item);
      });
      this.sendAction('chosenItemChanged', this.get('chosenItems'));
    },

    /**
     * Panel View is the definition of the view that
     * represents left or right columns
     */
    PanelView: Ember.CollectionView.extend(SelectionMixin, {
      // rewrite template property of itemViewClass in case of
      // rowRender is provided in the component constructor
      init: function () {
        var rowRender = this.get('parentView.rowRender');
        if (rowRender !== void 0) {
          this.get('itemViewClass').reopen({
            template: Ember.Handlebars.compile(rowRender)
          });
        }
        return this._super();
      },
      tagName: 'ul',

      attributeBindings: ['tabIndex'],

      tabIndex: -1,

      dragStart: function (ev) {
        var panelName = this.get('panel'), data;
        data = {
          columnName: panelName,
          items: this.get('selected').map(function (itemView) {
            return itemView.get('content');
          })
        };
        ev.dataTransfer.setData('Text', JSON.stringify(data));
      },

      dragOver: function (ev) {
        ev.preventDefault();
      },

      drop: function (ev) {
        var data = JSON.parse(ev.dataTransfer.getData("Text")),
          panelName = this.get('panel');

        // drop is done over the same panel
        if (panelName === data.columnName) {
          return false;
        }
        this.get('controller').swap(data.columnName, panelName, data.items);
        return false;
      },

      itemViewClass: Ember.View.extend({
        tagName: 'li',
        defaultTemplate: Ember.Handlebars.compile('{{view.content}}'),
        attributeBindings: ['draggable'],
        draggable: 'true'
  //        dragStart: function (ev) {
  //          if (this.get('parentView.selected.length') === 0) {
  //            this.get('parentView').handleSelection(ev, this);
  //          }
  //        }
      })
    })
  });

}());
