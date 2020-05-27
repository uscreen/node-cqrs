'use strict'

const assert = require('assert-plus')

const {
  getClassName,
  getHandledMessageTypes,
  getHandler,
  subscribe,
  validateHandlers
} = require('./utils')
const { InMemoryLock } = require('./locks')

/**
 * Base class for Projection definition
 */
module.exports = class AbstractProjection {
  /**
   * Name of Instance (to be used in keys, etc.)
   */
  get name() {
    return getClassName(this).toLowerCase()
  }

  /**
   * View associated with projection
   */
  get view() {
    return this._view
  }

  /**
   * Locker maybe overwritten by DI
   */
  get locker() {
    return this._locker || (this._locker = new InMemoryLock())
  }

  /**
   * Indicates if view should be restored from EventStore on start.
   * Override for custom behavior.
   */
  get shouldRestoreView() {
    return this.view instanceof Map
  }

  /**
   * Creates an instance of AbstractProjection
   */
  constructor({ eventStore, view, locking }) {
    validateHandlers(this)
    assert.object(view, 'view')
    assert.object(eventStore, 'eventStore')

    // assigned by DI
    this._eventStore = eventStore
    this._view = view
    this._locker = locking

    // decorate my view with a restore mixin (dirty?)
    this._view.restore = () => this.restore()
  }

  /**
   * Subscribe to event store
   */
  async subscribe(eventStore) {
    subscribe(eventStore, this, {
      masterHandler: this.project
    })

    const shouldRestore = await this.shouldRestoreView

    /* istanbul ignore next: @TODO needs unit test  */
    if (shouldRestore) await this.restore()
  }

  /**
   * Lock and pass event to handler
   */
  async project(event) {
    return this.locker.locked(`project-${event.aggregateId}`, async () => {
      const result = await this._project(event)
      this.view._emitter.emit(event.type, result)
      this.view._emitter.emit('afterChange', event)
      return result
    })
  }

  /**
   * Pass event to projection event handler
   */
  async _project(event) {
    const handler = getHandler(this, event.type)
    assert.func(handler, 'handler')
    return handler.call(this, event)
  }

  /**
   * Lock and start restore of projection
   */
  async restore() {
    return this.locker.locked(`restore-${this.name}`, () => this._restore())
  }

  /**
   * Restore projection view from event store
   */
  async _restore() {
    assert.ok(this._eventStore, 'this._eventStore')
    assert.func(this._eventStore.getAllEvents, 'this._eventStore.getAllEvents')

    const messageTypes = getHandledMessageTypes(this)
    const events = await this._eventStore.getAllEvents(messageTypes)

    for (const event of events) {
      await this._project(event)
    }
  }
}
