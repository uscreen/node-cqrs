'use strict'

const assert = require('assert-plus')
const info = require('debug')('cqrs:info')

const { isConcurrentView } = require('./utils/validators')
const subscribe = require('./subscribe')
const getHandledMessageTypes = require('./utils/getHandledMessageTypes')
const { validateHandlers } = require('./utils/validators')
const { getHandler, getClassName } = require('./utils')

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
    return this._view || (this._view = new Map())
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
  constructor(options) {
    validateHandlers(this)
    if (options && options.view) this._view = options.view
  }

  /**
   * Subscribe to event store
   */
  async subscribe(eventStore) {
    subscribe(eventStore, this, {
      masterHandler: this.project
    })

    const shouldRestore = await this.shouldRestoreView
    if (shouldRestore) await this.restore(eventStore)
  }

  /**
   * Pass event to projection event handler
   */
  async project(event) {
    const concurrentView = asConcurrentView(this.view)
    if (concurrentView && !concurrentView.ready)
      await concurrentView.once('ready')

    return this._project(event)
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
  async restore(eventStore) {
    // lock the view to ensure same restoring procedure
    // won't be performed by another projection instance
    const concurrentView = asConcurrentView(this.view)
    if (concurrentView) await concurrentView.lock()

    await this._restore(eventStore)

    if (concurrentView) await concurrentView.unlock()
  }

  /**
   * Restore projection view from event store
   */
  async _restore(eventStore) {
    assert.ok(eventStore, 'eventStore')
    assert.func(eventStore.getAllEvents, 'eventStore.getAllEvents')

    info('%s retrieving events...', this)

    const messageTypes = getHandledMessageTypes(this)
    const events = await eventStore.getAllEvents(messageTypes)

    if (!events.length) return

    info('%s restoring from %d event(s)...', this, events.length)

    for (const event of events) {
      try {
        await this._project(event)
      } catch (err) {
        info('%s view restoring has failed on event: %j', this, event)
        info(err)
        throw err
      }
    }

    info('%s view restored (%s)', this, this.view)
  }

  /**
   * Get human-readable Projection name
   */
  toString() {
    return getClassName(this)
  }

  get name() {
    return getClassName(this)
  }
}

module.exports = AbstractProjection
