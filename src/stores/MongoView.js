'use strict'

module.exports = class MongoView {
  constructor({ ObjectId, collection }) {
    this.ObjectId = ObjectId
    this._collection = collection
  }

  get collection() {
    return this._collection
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

  /* istanbul ignore next */
  get(key, options) {
    throw new TypeError('get() is unsupported - use read() instead')
  }

  /* istanbul ignore next */
  updateEnforcingNew(key, update) {
    throw new TypeError(
      'updateEnforcingNew() is unsupported - use update() instead'
    )
  }

  /* istanbul ignore next */
  updateAll(filter, update) {
    throw new TypeError('updateAll() is unsupported - use update() instead')
  }

  /* istanbul ignore next */
  deleteAll(filter) {
    throw new TypeError('deleteAll() is unsupported - use delete() instead')
  }

  /* istanbul ignore next */
  getAll(filter) {
    throw new TypeError('getAll() is unsupported - use list() instead')
  }

  /* istanbul ignore next */
  once(eventType) {
    throw new TypeError('once() got removed')
  }
}
