'use strict'

const EventEmitter = require('events')
const assert = require('assert-plus')

module.exports = class MongoView {
  /**
   * create a new view class
   */
  constructor({ ObjectId, collection }) {
    assert.func(ObjectId, '"ObjectId()" is required by MongoView')
    assert.object(collection, 'a "collection" is required by MongoView')

    this.ObjectId = ObjectId
    this._collection = collection
    this._emitter = new EventEmitter()
  }

  /**
   * Create a Promise which will resolve to a first emitted event of a given type
   */
  once(eventType) {
    assert.string(eventType, 'eventType')
    return new Promise(resolve => {
      this._emitter.once(eventType, resolve)
    })
  }

  /**
   * getter to gain access to raw storage
   * methods of mongodb collections, as if it where
   *
   * const client = await MongoClient.connect(mongoUri)
   * const db = client.db()
   * const collection = db.collection('events')
   */
  get collection() {
    return this._collection
  }

  /**
   * create a new record, fails on exiting _id
   */
  create(key, value) {
    assert.ok(key)
    assert.object(value)
    return this.collection.insertOne(
      Object.assign(value, { _id: this.ObjectId(key) })
    )
  }

  /**
   * read existing record, returns empty results on fail
   */
  read(key) {
    assert.ok(key)
    return this.findOne({ _id: this.ObjectId(key) })
  }

  /**
   * atomically update exiting records.
   * `$set: value` should only update given attributes
   */
  update(key, value) {
    assert.ok(key)
    assert.object(value)
    return this.collection.findOneAndUpdate(
      { _id: this.ObjectId(key) },
      { $set: value },
      { returnOriginal: false, upsert: false }
    )
  }

  /**
   * delete one existing record by _id
   */
  delete(key) {
    assert.ok(key)
    return this.collection.findOneAndDelete({
      _id: this.ObjectId(key)
    })
  }

  /**
   * delete all records
   */
  clear() {
    return this.collection.deleteMany({})
  }

  /**
   * find one record by search query
   */
  findOne(query) {
    assert.object(query)
    return this.collection.findOne(query)
  }

  /**
   * find all records (list) by search query
   */
  list(query) {
    assert.optionalObject(query)
    return this.collection.find(query).toArray()
  }
}
