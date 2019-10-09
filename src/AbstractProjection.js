'use strict'

const assert = require('assert-plus')
const info = require('debug')('cqrs:info')

const subscribe = require('./subscribe')
const InMemoryView = require('./infrastructure/InMemoryView')
const getHandledMessageTypes = require('./utils/getHandledMessageTypes')
const { validateHandlers, getHandler, getClassName } = require('./utils')

const isConcurrentView = view =>
  typeof view.lock === 'function' &&
  typeof view.unlock === 'function' &&
  typeof view.once === 'function'

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
    return this._view || (this._view = new InMemoryView())
  }

  /**
   * Indicates if view should be restored from EventStore on start.
   * Override for custom behavior.
   */
  get shouldRestoreView() {
    return this.view instanceof Map || this.view instanceof InMemoryView
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

    await this.restore(eventStore)
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

    const shouldRestore = await this.shouldRestoreView
    if (shouldRestore) await this._restore(eventStore)

    if (concurrentView) concurrentView.unlock()
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
