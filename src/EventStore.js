'use strict'

const EventEmitter = require('events')
const assert = require('assert-plus')

const {
  validateEvent,
  validateEventStorage,
  validateMessageBus,
  validateSnapshotStorage
} = require('./utils')
const EventStream = require('./EventStream')

const SNAPSHOT_EVENT_TYPE = 'snapshot'

class EventStore {
  /**
   * Whether storage supports aggregate snapshots
   */
  get snapshotsSupported() {
    return Boolean(this._snapshotStorage)
  }

  /**
   * Creates an instance of EventStore.
   */
  constructor(options) {
    validateEventStorage(options.storage)
    validateMessageBus(options.messageBus)
    if (options.snapshotStorage) {
      validateSnapshotStorage(options.snapshotStorage)
    }
    assert.optionalFunc(options.eventValidator, 'options.eventValidator')

    this._storage = options.storage
    this._snapshotStorage = options.snapshotStorage
    this._validator = options.eventValidator || validateEvent
    this._sagaStarters = []
    this._publishTo = options.messageBus
    this._eventEmitter = options.messageBus
    this._internalEmitter = new EventEmitter()
  }

  /**
   * Retrieve all events of specific types
   */
  async getAllEvents(eventTypes) {
    assert.optionalArray(eventTypes, 'eventTypes')
    const events = await this._storage.getEvents(eventTypes)
    return new EventStream(events)
  }

  /**
   * Retrieve all events of specific Aggregate
   */
  async getAggregateEvents(aggregateId) {
    assert.ok(aggregateId, 'aggregateId')

    const snapshot = this.snapshotsSupported
      ? await this._snapshotStorage.getAggregateSnapshot(aggregateId)
      : undefined
    const events = await this._storage.getAggregateEvents(aggregateId, {
      snapshot
    })
    return new EventStream(snapshot ? [snapshot, ...events] : events)
  }

  /**
   * Retrieve events of specific Saga
   */
  async getSagaEvents(sagaId, filter) {
    assert.ok(sagaId, 'sagaId')
    assert.object(filter, 'filter')
    assert.object(filter.beforeEvent, 'filter.beforeEvent')
    assert.number(filter.beforeEvent.sagaVersion, 'beforeEvent.sagaVersion')

    const events = await this._storage.getSagaEvents(sagaId, filter)
    return new EventStream(events)
  }

  /**
   * Register event types that start sagas.
   * Upon such event commit a new sagaId will be assigned
   */
  registerSagaStarters(eventTypes) {
    assert.arrayOfString(eventTypes, 'eventTypes')
    const uniqueEventTypes = eventTypes.filter(
      (e) => !this._sagaStarters.includes(e)
    )
    this._sagaStarters.push(...uniqueEventTypes)
  }

  /**
   * Validate events, persist and publish
   */
  async commit(events) {
    assert.array(events, 'events')
    const eventStreamWithoutSnapshots = await this.save(events)
    await this.publish(eventStreamWithoutSnapshots)
    return eventStreamWithoutSnapshots
  }

  /**
   * Save events to the persistent storage(s)
   */
  async save(events) {
    assert.array(events, 'events')

    const snapshotEvents = events.filter((e) => e.type === SNAPSHOT_EVENT_TYPE)

    assert.ok(
      !(snapshotEvents.length > 1),
      `cannot commit a stream with more than 1 ${SNAPSHOT_EVENT_TYPE} event`
    )
    assert.ok(
      !(snapshotEvents.length && !this.snapshotsSupported),
      `${SNAPSHOT_EVENT_TYPE} event type is not supported by the storage`
    )

    const snapshot = snapshotEvents[0]
    const eventStream = new EventStream(events.filter((e) => e !== snapshot))
    eventStream.forEach(this._validator)

    await this._storage.commitEvents(eventStream)

    if (snapshot) {
      await this._snapshotStorage.saveAggregateSnapshot(snapshot)
    }

    return eventStream
  }

  /**
   * After events are
   * @TODO recheck setImmediate sequence... or parallel
   */
  async publish(eventStream) {
    setImmediate(() =>
      Promise.all(
        eventStream.map((event) => {
          const published = this._publishTo.publish(event)
          this._internalEmitter.emit(event.type, event)
          return published
        })
      )
    )
  }

  /**
   * Setup a listener for a specific event type
   */
  on(messageType, handler) {
    assert.string(messageType, 'messageType')
    assert.func(handler, 'handler')
    this._eventEmitter.on(messageType, handler)
  }

  /**
   * Get or create a named queue, which delivers events to a single handler only
   */
  queue(name) {
    assert.func(
      this._eventEmitter.queue,
      'Named queues are not supported by the underlying message bus'
    )
    return this._eventEmitter.queue(name)
  }

  /**
   * Create a Promise which will resolve to a first emitted event of a given type
   * @TODO check to attach to _eventEmitter?
   */
  once(messageTypes) {
    assert.string(messageTypes, 'messageTypes')
    return new Promise((resolve) => {
      this._internalEmitter.once(messageTypes, resolve)
    })
  }
}

module.exports = EventStore
