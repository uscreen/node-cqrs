'use strict'

const assert = require('assert-plus')
const info = require('debug')('cqrs:info')

const subscribe = require('./subscribe')
const InMemoryLock = require('./locks/InMemoryLock')
const getHandledMessageTypes = require('./utils/getHandledMessageTypes')
const { validateHandlers } = require('./utils/validators')
const { getHandler, getClassName } = require('./utils')

/**
 * Base class for Projection definition
 */
module.exports = class AbstractProjection {
  /**
   * Creates an instance of AbstractProjection
   */
  constructor({ eventStore, view }) {
    validateHandlers(this)
    assert.object(view, 'view')
    assert.object(eventStore, 'eventStore')

    this._eventStore = eventStore
    this._view = view

    // decorate my view with a restore mixin (dirty?)
    this._view.restore = () => this.restore()
  }

  /**
   * Name of Instance (to be used in keys, etc.)
   */
  get name() {
    return getClassName(this)
  }

  /**
   * List of event types being handled by projection. Can be overridden in projection implementation
   */
  static get handles() {
    return undefined
  }

  /**
   * View associated with projection
   */
  get view() {
    return this._view || /* istanbul ignore next */ (this._view = new Map())
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
   * Subscribe to event store
   */
  async subscribe(eventStore) {
    subscribe(eventStore, this, {
      masterHandler: this.project
    })

    const shouldRestore = await this.shouldRestoreView

    /* istanbul ignore next */
    if (shouldRestore) await this.restore()
  }

  /**
   * Pass event to projection event handler
   */
  async project(event) {
    return this.locker.locked(`project-${event.aggregateId}`, async () => {
      const result = await this._project(event)
      this.view._emitter.emit(event.type, result)
      return result
    })
  }

  /**
   * Pass event to projection event handler, without awaiting for restore operation to complete
   */
  async _project(event) {
    const handler = getHandler(this, event.type)
    assert.func(handler, 'handler')
    return handler.call(this, event)
  }

  /**
   * Restore projection view from event store
   */
  async restore() {
    return this.locker.locked(`restore-${this.name}`, async () => {
      const result = await this._restore()
      return result
    })
  }

  /**
   * Restore projection view from event store
   */
  async _restore() {
    assert.ok(this._eventStore, 'this._eventStore')
    assert.func(this._eventStore.getAllEvents, 'this._eventStore.getAllEvents')

    info('%s retrieving events...', this)

    const messageTypes = getHandledMessageTypes(this)
    const events = await this._eventStore.getAllEvents(messageTypes)

    /* istanbul ignore next */
    if (!events.length) return

    info('%s restoring from %d event(s)...', this, events.length)

    for (const event of events) {
      try {
        await this._project(event)
      } catch (err) /* istanbul ignore next */ {
        info('%s view restoring has failed on event: %j', this, event)
        info(err)
        throw err
      }
    }

    info('%s view restored (%s)', this, this.view)
  }
}
