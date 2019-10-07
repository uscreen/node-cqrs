'use strict'

const EventEmitter = require('events')
const { sizeOf } = require('../utils')

const applyUpdate = (view, update) => {
  const valueReturnedByUpdate = update(view)
  return valueReturnedByUpdate === undefined ? view : valueReturnedByUpdate
}

/**
 * In-memory Projection View, which suspends get()'s until it is ready
 *
 * @class InMemoryView
 * @implements {IInMemoryView<any>}
 */
module.exports = class MongoView {
  get ready() {
    return this._ready
  }

  get size() {
    return this._map.size
  }

  constructor() {
    console.log('--------------------> mongo view')
    this._map = new Map()
    this._emitter = new EventEmitter()

    // explicitly bind functions to this object for easier using in Promises
    Object.defineProperties(this, {
      get: { value: this.get.bind(this) }
    })
  }

  async lock() {
    if (this.ready === false) await this.once('ready')

    this._ready = false
  }

  async unlock() {
    this._ready = true
    this._emitter.emit('ready')
  }

  has(key) {
    return this._map.has(key)
  }

  async get(key, options) {
    if (!key) throw new TypeError('key argument required')

    if (!this._ready && !(options && options.nowait)) await this.once('ready')

    return Object.assign({ _id: key }, this._map.get(key))
  }

  async getAll(filter) {
    if (filter && typeof filter !== 'function')
      throw new TypeError('filter argument, when defined, must be a Function')

    if (!this._ready) await this.once('ready')

    const r = []
    for (const entry of this._map.entries()) {
      if (!filter || filter(entry[1], entry[0])) r.push(entry)
    }

    return r
  }

  create(key, value = {}) {
    if (!key) throw new TypeError('key argument required')
    if (typeof value === 'function')
      throw new TypeError('value argument must be an instance of an Object')

    if (this._map.has(key)) throw new Error(`Key '${key}' already exists`)

    this._map.set(key, value)
  }

  update(key, update) {
    if (!key) throw new TypeError('key argument required')
    if (typeof update !== 'function')
      throw new TypeError('update argument must be a Function')

    if (!this._map.has(key)) throw new Error(`Key '${key}' does not exist`)

    this._update(key, update)
  }

  updateEnforcingNew(key, update) {
    if (!key) throw new TypeError('key argument required')
    if (typeof update !== 'function')
      throw new TypeError('update argument must be a Function')

    if (!this._map.has(key))
      return this.create(key, applyUpdate(undefined, update))

    return this._update(key, update)
  }

  updateAll(filter, update) {
    if (filter && typeof filter !== 'function')
      throw new TypeError('filter argument, when specified, must be a Function')
    if (typeof update !== 'function')
      throw new TypeError('update argument must be a Function')

    for (const [key, value] of this._map) {
      if (!filter || filter(value)) this._update(key, update)
    }
  }

  _update(key, update) {
    const value = this._map.get(key)
    this._map.set(key, applyUpdate(value, update))
  }

  delete(key) {
    if (!key) throw new TypeError('key argument required')

    this._map.delete(key)
  }

  deleteAll(filter) {
    if (filter && typeof filter !== 'function')
      throw new TypeError('filter argument, when specified, must be a Function')

    for (const [key, value] of this._map) {
      if (!filter || filter(value)) this._map.delete(key)
    }
  }

  markAsReady() {
    this.unlock()
  }

  once(eventType) {
    if (typeof eventType !== 'string' || !eventType.length)
      throw new TypeError('eventType argument must be a non-empty String')

    return new Promise(resolve => {
      this._emitter.once(eventType, resolve)
    })
  }

  toString() {
    return `${this.size} record${this.size !== 1 ? 's' : ''}, ${sizeOf(
      this._map
    )} bytes`
  }
}
