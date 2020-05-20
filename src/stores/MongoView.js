'use strict'

const EventEmitter = require('events')
const assert = require('assert-plus')

module.exports = class MongoView {
  /**
   * create a new view class
   */
  constructor({ collection }) {
    assert.object(collection, 'a "collection" is required by MongoView')
    this._collection = collection
    this._emitter = new EventEmitter()
    this.createIndex()
  }

  /**
   * creating indecies now (mongodb >= 3.5.x) requires
   * awaiting the promise, constructor can't be async, so..
   */
  async createIndex() {
    await this._collection
      .createIndex({ id: 1 }, { unique: true, sparse: true })
      .catch((e) => {})
  }

  /**
   * Create a Promise which will resolve to a first emitted event of a given type
   */
  once(eventType) {
    assert.string(eventType, 'eventType')
    return new Promise((resolve) => {
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
   * create a new record, fails on exiting id
   */
  create(id, value) {
    assert.ok(id)
    assert.object(value)
    return this.collection.insertOne(
      Object.assign(value, { id, created: new Date() })
    )
  }

  /**
   * read existing record, returns empty results on fail
   */
  read(id) {
    assert.ok(id)
    return this.findOne({ id })
  }

  /**
   * atomically update exiting records.
   * `$set: value` should only update given attributes
   */
  update(id, value, upsert = false) {
    assert.ok(id)
    assert.object(value)
    return this.collection.findOneAndUpdate(
      { id },
      { $set: value, $currentDate: { modified: true } },
      { returnOriginal: false, upsert }
    )
  }

  /**
   * delete one existing record by id
   */
  delete(id) {
    assert.ok(id)
    return this.collection.findOneAndDelete({ id })
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
    return this.collection.findOne(query, { projection: { _id: false } })
  }

  /**
   * find all records (list) by search query
   */
  list(query) {
    assert.optionalObject(query)
    return this.collection.find(query, { projection: { _id: false } }).toArray()
  }
}
