'use strict'

module.exports = class MongoView {
  constructor({ mongo, collection }) {
    this.ObjectId = mongo.ObjectId
    this.collection = mongo.db.collection(collection)
  }

  create(key, value = {}) {
    return this.collection.insertOne(Object.assign(value, { _id: key }))
  }

  read(key) {
    return this.findOne({ _id: this.ObjectId(key) })
  }

  update(key, value = {}) {
    return this.collection.findOneAndUpdate(
      { _id: this.ObjectId(key) },
      { $set: value },
      { returnOriginal: false, upsert: false }
    )
  }

  delete(key) {
    return this.collection.findOneAndDelete({
      _id: this.ObjectId(key)
    })
  }

  findOne(query) {
    return this.collection.findOne(query)
  }

  list(query = {}) {
    return this.collection.find(query).toArray()
  }

  /**
   * keep some deprecated methods to comply with any
   * possible interface
   * @todo check remove unused
   *
   * -----------------------------------------------------------------------
   *
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

  getAll(filter) {
    throw new TypeError('getAll() is unsupported - use list() instead')
  }

  once(eventType) {
    throw new TypeError('once() got removed')
  }
}
