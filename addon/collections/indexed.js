import Ember from 'ember';
import Collection from './base';
import MetaModel from '../model/meta-model';
import PromiseProxy from './promise';

var get = Ember.get;
var set = Ember.set;

export default Collection.extend({

  firebaseEvents: "child_changed",

  as: null, // the meta model wrapper to use

  toFirebaseJSON() {
    var value;
    return this.reduce(function(json, item) {
      if (item instanceof MetaModel) {
        value = item.toFirebaseJSON(true);
      } else {
        value = true;
      }
      json[get(item, 'id')] = value;
      return json;
    }, {});
  },

  // If we start listening straight after initializing then this is redundant
  // as all the data gets sent in onFirebaseChildAdded anyway
  // but we don't know if we're going to be live or not in the near future
  // so inflate if we have a snapshot
  inflateFromSnapshot: Ember.on("init", function() {
    var snapshot = get(this, "snapshot");
    if (!snapshot) { return; }

    var content = Ember.A(), _this = this;
    snapshot.forEach(function(child) {
      content.push(_this.itemFromSnapshot(child));
    });
    set(this, "content", content);
  }),

  contentChanged: Ember.on("init", Ember.observer("content", function() {
    if (this._updatingContent) { return; }

    var content = get(this, "content");
    if (!content) { return; }

    var anyTransformed = false;
    var transformed = content.map(function(item){
      if (item instanceof Ember.Object) {
        item = this.itemFromRecord(item);
        anyTransformed = true;
      }
      return item;
    }, this);

    if (anyTransformed) {
      this._updatingContent = true;
      set(this, "content", Ember.A(transformed));
      this._updatingContent = false;
    }
  })),

  // if we're listening, then our meta model items should be too
  listenToFirebase() {
    if (get(this, "as")) {
      this.invoke("listenToFirebase");
    }
    return this._super();
  },

  stopListeningToFirebase() {
    if (get(this, "as")) {
      this.invoke("stopListeningToFirebase");
    }
    return this._super();
  },

  fetch() {
    var promise = this.listenToFirebase().
      then(this._fetchAll.bind(this)).
      then(Ember.K.bind(this));

    return PromiseProxy.create({promise: promise});
  },

  _fetchAll() {
    return Ember.RSVP.all(get(this, "content").map(function(item, index) {
      return this.objectAtContentAsPromise(index);
    }, this));
  },

  itemFromSnapshot(snapshot) {
    return {
      id:       snapshot.key(),
      snapshot: snapshot,
      record:   null
    };
  },

  itemFromRecord(record) {
    return {
      id:       get(record, 'id'),
      snapshot: null,
      record:   this.wrapRecordInMetaObjectIfNeccessary(record)
    };
  },

  replaceContent(start, numRemoved, objectsAdded) {
    objectsAdded = objectsAdded.map(function(object) {
      if (object instanceof MetaModel) {
        object.set("parent", this);
        return this.itemFromRecord(object);
      } else if (object instanceof Ember.Object) {
        return this.itemFromRecord(object);
      } else {
        return object;
      }
    }, this);
    return this._super(start, numRemoved, objectsAdded);
  },

  objectAtContent(idx) {
    var content = get(this, "content");
    if (!content || !content.length) {
      return;
    }

    var item = content.objectAt(idx);
    if (!item) {
      return;
    }

    // already inflated
    if (item.record) {
      return item.record;
    }

    item.record = this.findFetchRecordFromItem(item, false);

    item.record.get("promise").then(function(obj) {
      if (item.record instanceof MetaModel) {
        item.record.set("content", obj);
      } else {
        item.record = obj;
      }
    });

    return item.record;
  },

  objectAtContentAsPromise(idx) {
    var content = get(this, "content");
    if (!content || !content.length) {
      return Ember.RSVP.reject();
    }

    var item = content.objectAt(idx);
    if (!item) {
      return Ember.RSVP.reject();
    }

    // already inflated
    if (item.record) {
      // is the item.record a promise proxy, if so return that
      // so we end up with the actual object
      var promise = item.record.get("promise");
      if (promise) {
        return promise;
      }
      return Ember.RSVP.resolve(item.record);
    }

    var recordPromise = this.findFetchRecordFromItem(item, true);
    return recordPromise.then(function(record) {
      item.record = record;
      return item.record;
    });
  },

  // TODO - handle findOne failing (permissions / 404)
  findFetchRecordFromItem(item, returnPromise) {
    var store  = get(this, "store"),
        query  = get(this, "query"),
        type   = this.modelClassFromSnapshot(item.snapshot),
        _this  = this,
        record;

    if (returnPromise) {
      record = store.fetchOne(type, item.id, query);
      return record.then(function(resolved) {
        return _this.wrapRecordInMetaObjectIfNeccessary(resolved, item.snapshot);
      });
    } else {
      record = store.findOne(type, item.id, query);
      return this.wrapRecordInMetaObjectIfNeccessary(record, item.snapshot);
    }
  },

  wrapRecordInMetaObjectIfNeccessary(record, snapshot) {
    var as = get(this, "as");
    if (!as || record instanceof MetaModel) {
      return record;
    }

    var store    = get(this, "store"),
        priority = snapshot ? snapshot.getPriority() : null;

    var meta = store.buildRecord(as, null, {
      content:  record,
      priority: priority,
      snapshot: snapshot,
      parent:   this
    });

    if (snapshot) {
      meta.listenToFirebase();
    }
    return meta;
  },

  onFirebaseChildAdded(snapshot, prevItemName) {
    var id      = snapshot.key(),
        content = get(this, "content");

    if (content.findBy('id', id)) { return; }

    var item = this.itemFromSnapshot(snapshot);
    this.insertAfter(prevItemName, item, content);
  },

  onFirebaseChildRemoved(snapshot) {
    var content = get(this, "content"),
        item    = content.findBy('id', snapshot.key());

    if (!item) { return; }

    content.removeObject(item);
  },

  onFirebaseChildMoved(snapshot, prevItemName) {
    var content = get(this, "content"),
        item    = content.findBy('id', snapshot.key());

    if (!item) { return; }

    content.removeObject(item);

    // only set priority on the meta-model, otherwise we'd nuke the priority
    // on the underlying record which exists elsewhere in the tree and could have
    // its own priority
    if (get(this, "as") && item.record) {
      set(item.record, 'priority', snapshot.getPriority());
    }

    this.insertAfter(prevItemName, item, content);
  },

  onFirebaseChildChanged(snapshot) {
    var content = get(this, "content"),
        item    = content.findBy('id', snapshot.key());

    if (!item) { return; }

    // if the type has changed, we need to fetch a new item
    // otherwise we can just ignore this and assume the model itself is listening
    var klass = this.modelClassFromSnapshot(snapshot);
    var record = item.record;

    if (record && this.get("as")) {
      record = record.get("content");
    }

    if (record && record.constructor.typeKey === klass.typeKey) {
      return;
    }

    // it's a polymorph whose type has changed, fetch a new item
    var index   = content.indexOf(item),
        newItem = this.itemFromSnapshot(snapshot);

    content.replace(index, 1, [newItem]);
  }

});