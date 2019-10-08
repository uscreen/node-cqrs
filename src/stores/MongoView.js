'use strict'

const assert = require('assert').strict

assert.isObject = (thing, message) => {
  assert(typeof thing === 'object', message)
}

const EventEmitter = require('events')

module.exports = class MongoView {
  constructor({ mongo, collection }) {
    this.ObjectId = mongo.ObjectId
    this.collection = mongo.db.collection(collection)
    this.emitter = new EventEmitter()
  }

  create(key, value = {}) {
    assert(key, 'key required')
    assert.isObject(value, 'value must be object')
    return this.collection.insertOne(Object.assign(value, { _id: key }))
  }

  read(key) {
    assert(key, 'key required')
    return this.findOne({ _id: this.ObjectId(key) })
  }

  update(key, value = {}) {
    assert(key, 'key required')
    assert.isObject(value, 'value must be object')
    return this.collection.findOneAndUpdate(
      { _id: this.ObjectId(key) },
      { $set: value },
      { returnOriginal: false, upsert: true }
    )
  }

  delete(key) {
    assert(key, 'key required')
    return this.collection.findOneAndDelete({
      _id: this.ObjectId(key)
    })
  }

  findOne(query) {
    assert.isObject(query, 'query must be object')
    return this.collection.findOne(query)
  }

  list(query = {}) {
    assert.isObject(query, 'query must be object')
    return this.collection.find(query).toArray()
  }

  once(eventType) {
    assert(eventType, 'eventType argument must be a non-empty String')
    return new Promise(resolve => {
      this.emitter.once(eventType, resolve)
    })
  }

  /**
   * keep some deprecated methods to comply with any
   * possible interface
   * @todo check remove unused
   */

  get(key, options) {
    throw new TypeError('get() is unsupported - use read() instead')
  }

  updateEnforcingNew(key, update) {
    throw new TypeError(
      'updateEnforcingNew() is unsupported - use update() instead'
    )
  }

  updateAll(filter, update) {
    throw new TypeError('updateAll() is unsupported - use update() instead')
  }

  deleteAll(filter) {
    throw new TypeError('deleteAll() is unsupported - use delete() instead')
  }

  async getAll(filter) {
    throw new TypeError('getAll() is unsupported - use list() instead')
  }
}
