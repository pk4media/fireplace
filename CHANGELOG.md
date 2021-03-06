# CHANGELOG

## v0.4.0

* Moved Store to be a service, so now located at `app/services/store.js` vs `app/stores/main.js`
* Updated to Ember-CLI 2.2.0-beta.3
* Use getOwner vs using container directly (with polyfill for older Ember versions)

## v0.3.8

* fix queries with falsey values

## v0.3.7

* use `ember-inflector` from NPM instead of Bower

## v0.3.6

* Remove deprecated usage of `isEvery` and `findProperty`
* Fix accidental early exiting of Snapshot#forEach when setting up collection

## v0.3.5

* Bugfix - handle null values in deepEqual comparison

## v0.3.4

* Fixed issue where hash attributes would be marked as changed when they were not

## v0.3.3

* Fixed MetaModel parent not being set when replacing whole content (or initializing) an IndexedCollection
* use new-style computed property getters & setters (removes deprecation warnings in canary)

## v0.3.2

* Update ember-cli to v0.2.0
* Use bower version of ember-inflector

## v0.3.1

* Optionally include `id` in embedded object attributes

## v0.3.0

* Update to Firebase 2.1.x
* Stop calling deprecated Snapshot#name, use Snapshot#key instead

## v0.2.11

* Check arguments.length > 1 instead of === 2 for detecting set vs get of computed properties

## v0.2.10

* Update ember-cli to 0.1.5

## v0.2.9

* Ember.Map#length is deprecated, use #size instead
* Ember.assert in canary now calls functions, so coerce tests to booleans

## v0.2.8

* added Store#saveCollection

## v0.2.7

* export MetaModel from index

## v0.2.6

* timestamp transform serializes Firebase.ServerValue.TIMESTAMP
* timestamp transform exports `now` helper, also re-exported from index

## v0.2.5

* Collection#fetch promise proxy should be an array proxy

## v0.2.4

* Collection#fetch returns a promise proxy

## v0.2.3

* Fix Model#toFirebaseJSON for Ember 1.8.0

## v0.2.2

* pass Model#firebasePath function result through path expansion
* add Model#firebasePathOptions to more easily change options passed to firebasePath

## v0.2.1

* Fix race condition when listening to firebase

## v0.2.0

* Added `fetch` to collections to return a promise which resolves when their content is fully loaded
* Store fetch for query now waits for content to be loaded instead of just a collection's index

## v0.1.1

* exported transforms under app namespace

## v0.1.0

* Converted to Ember CLI addon
* Converted to ES6 modules
* Changed store injection initializer name to 'fireplace:inject-store'