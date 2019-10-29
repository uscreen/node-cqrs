'use strict'

const assert = require('assert-plus')
const info = require('debug')('cqrs:info')

const { isConcurrentView } = require('./utils/validators')
const subscribe = require('./subscribe')
const getHandledMessageTypes = require('./utils/getHandledMessageTypes')
const { validateHandlers } = require('./utils/validators')
const { getHandler, getClassName } = require('./utils')

/* istanbul ignore next */
const asConcurrentView = view => (isConcurrentView(view) ? view : undefined)

/**
 * Base class for Projection definition
 */
class AbstractProjection {
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
   * Indicates if view should be restored from EventStore on start.
   * Override for custom behavior.
   */
  get shouldRestoreView() {
    return this.view instanceof Map
  }

  /**
   * Creates an instance of AbstractProjection
   */
  constructor({ eventStore, view }) {
    validateHandlers(this)

    /* istanbul ignore else */
    if (view) {
      this._view = view

      // decorate my view with a restore mixin
      this._view.restore = () => this.restore()
      // this._view._EventEmitter = new EventEmitter()
    }

    /* istanbul ignore else */
    if (eventStore) this._eventStore = eventStore
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
    const concurrentView = asConcurrentView(this.view)

    /* istanbul ignore next */
    if (concurrentView && !concurrentView.ready) {
      await concurrentView.once('ready')
    }

    /* istanbul ignore else */
    if (concurrentView) await concurrentView.lock()
    const result = await this._project(event)

    this.view._emitter.emit(event.type, result)
    // console.log('--------------->', event.type)

    /* istanbul ignore else */
    if (concurrentView) await concurrentView.unlock()

    return result
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
    // lock the view to ensure same restoring procedure
    // won't be performed by another projection instance
    const concurrentView = asConcurrentView(this.view)

    /* istanbul ignore else */
    if (concurrentView) await concurrentView.lock()

    await this._restore()

    /* istanbul ignore else */
    if (concurrentView) await concurrentView.unlock()
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

  get name() {
    return getClassName(this)
  }
}

module.exports = AbstractProjection
