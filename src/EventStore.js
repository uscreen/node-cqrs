'use strict'

const {
  validateMessageBus,
  validateEventStorage,
  validateSnapshotStorage,
  validateEvent
} = require('./utils/validators')

const assert = require('assert-plus')
const debug = require('debug')('cqrs:debug:EventStore')
const info = require('debug')('cqrs:info:EventStore')
const EventStream = require('./EventStream')

const SNAPSHOT_EVENT_TYPE = 'snapshot'

const _defaults = {
  publishAsync: true
}

class EventStore {
  /**
   * Default configuration
   */
  static get defaults() {
    return _defaults
  }

  /**
   * Configuration
   */
  get config() {
    return this._config
  }

  /**
   * Whether storage supports aggregate snapshots
   */
  get snapshotsSupported() {
    return Boolean(this._snapshotStorage)
  }

  /**
   * Creates an instance of EventStore.
   *
   * @param {object} options
   * @param {IEventStorage} options.storage
   * @param {IAggregateSnapshotStorage} [options.snapshotStorage]
   * @param {IMessageBus} options.messageBus
   * @param {function(IEvent):void} [options.eventValidator]
   * @param {EventStoreConfig} [options.eventStoreConfig]
   */
  constructor(options) {
    validateEventStorage(options.storage)
    validateMessageBus(options.messageBus)

    if (options.snapshotStorage) {
      validateSnapshotStorage(options.snapshotStorage)
    }

    assert.optionalFunc(options.eventValidator, 'options.eventValidator')

    this._config = Object.freeze(
      Object.assign({}, EventStore.defaults, options.eventStoreConfig)
    )
    this._storage = options.storage
    this._snapshotStorage = options.snapshotStorage
    this._validator = options.eventValidator || validateEvent

    this._sagaStarters = []
    this._publishTo = options.messageBus
    this._eventEmitter = options.messageBus

    // for internal `once` subscriptions
    // this._internalEmitter = new EventEmitter()
  }

  /**
   * Retrieve new ID from the storage
   */
  async getNewId() {
    return this._storage.getNewId()
  }

  /**
   * Retrieve all events of specific types
   */
  async getAllEvents(eventTypes, filter) {
    assert.optionalArray(eventTypes, 'eventTypes')

    /* istanbul ignore next */
    debug('retrieving %s events...', eventTypes ? eventTypes.join(', ') : 'all')

    const events = await this._storage.getEvents(eventTypes, filter)
    const eventStream = new EventStream(events)
    debug('%s retrieved', eventStream)

    return eventStream
  }

  /**
   * Retrieve all events of specific Aggregate
   */
  async getAggregateEvents(aggregateId) {
    assert.ok(aggregateId, 'aggregateId')
    debug(`retrieving event stream for aggregate ${aggregateId}...`)

    const snapshot = this.snapshotsSupported
      ? await this._snapshotStorage.getAggregateSnapshot(aggregateId)
      : undefined

    const events = await this._storage.getAggregateEvents(aggregateId, {
      snapshot
    })
    const eventStream = new EventStream(
      snapshot ? [snapshot, ...events] : events
    )
    debug('%s retrieved', eventStream)

    return eventStream
  }

  /**
   * Retrieve events of specific Saga
   */
  async getSagaEvents(sagaId, filter) {
    assert.ok(sagaId, 'sagaId')
    assert.ok(filter, 'filter')
    assert.ok(filter.beforeEvent, 'filter.beforeEvent')
    assert.number(
      filter.beforeEvent.sagaVersion,
      'filter.beforeEvent.sagaVersion'
    )
    debug(
      `retrieving event stream for saga ${sagaId}, v${filter.beforeEvent.sagaVersion}...`
    )

    const events = await this._storage.getSagaEvents(sagaId, filter)
    const eventStream = new EventStream(events)
    debug('%s retrieved', eventStream)

    return eventStream
  }

  /**
   * Register event types that start sagas.
   * Upon such event commit a new sagaId will be assigned
   */
  registerSagaStarters(
    /* istanbul ignore next */
    eventTypes = []
  ) {
    const uniqueEventTypes = eventTypes.filter(
      e => !this._sagaStarters.includes(e)
    )
    this._sagaStarters.push(...uniqueEventTypes)
  }

  /**
   * Validate events, commit to storage and publish to messageBus, if needed
   */
  async commit(events) {
    assert.array(events, 'events')

    const containsSagaStarters =
      this._sagaStarters.length &&
      events.some(e => this._sagaStarters.includes(e.type))
    const augmentedEvents = containsSagaStarters
      ? await this._attachSagaIdToSagaStarterEvents(events)
      : events

    const eventStreamWithoutSnapshots = await this.save(augmentedEvents)

    // after events are saved to the persistent storage,
    // publish them to the event bus (i.e. RabbitMq)
    /* istanbul ignore else */
    if (this._publishTo) await this.publish(eventStreamWithoutSnapshots)

    return eventStreamWithoutSnapshots
  }

  /**
   * Generate and attach sagaId to events that start new sagas
   */
  async _attachSagaIdToSagaStarterEvents(events) {
    const r = []
    for (const event of events) {
      /* istanbul ignore else */
      if (this._sagaStarters.includes(event.type)) {
        assert.ok(
          !event.sagaId,
          `Event "${event.type}" already contains sagaId. Multiple sagas with same event type are not supported`
        )
        r.push(
          Object.assign(
            {
              sagaId: await this.getNewId(),
              sagaVersion: 0
            },
            event
          )
        )
      } else {
        r.push(event)
      }
    }
    return new EventStream(r)
  }

  /**
   * Save events to the persistent storage(s)
   */
  async save(events) {
    assert.array(events, 'events')

    const snapshotEvents = events.filter(e => e.type === SNAPSHOT_EVENT_TYPE)
    assert.ok(
      !(snapshotEvents.length > 1),
      `cannot commit a stream with more than 1 ${SNAPSHOT_EVENT_TYPE} event`
    )
    assert.ok(
      !(snapshotEvents.length && !this.snapshotsSupported),
      `${SNAPSHOT_EVENT_TYPE} event type is not supported by the storage`
    )

    const snapshot = snapshotEvents[0]
    const eventStream = new EventStream(events.filter(e => e !== snapshot))

    debug('validating %s...', eventStream)
    eventStream.forEach(this._validator)

    debug('saving %s...', eventStream)
    await this._storage.commitEvents(eventStream)
    if (snapshot) {
      await this._snapshotStorage.saveAggregateSnapshot(snapshot)
    }

    return eventStream
  }

  /**
   * After events are saved the get published
   */
  async publish(eventStream) {
    const publishEvents = () =>
      Promise.all(
        eventStream.map(event => this._publishTo.publish(event))
      ).then(
        () => {
          debug('%s published', eventStream)
        },
        /* istanbul ignore next */
        err => {
          info('%s publishing failed: %s', eventStream, err)
          throw err
        }
      )

    /* istanbul ignore else */
    if (this.config.publishAsync) {
      debug('publishing %s asynchronously...', eventStream)
      setImmediate(publishEvents)
    } else {
      debug('publishing %s synchronously...', eventStream)
      await publishEvents()
    }
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
   */
  once(type) {
    assert.string(type, 'type')
    return this._eventEmitter.once(type)
  }
}

module.exports = EventStore
