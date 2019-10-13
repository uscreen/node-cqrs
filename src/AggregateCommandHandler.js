'use strict'

const assert = require('assert-plus')
const info = require('debug')('cqrs:info')

const subscribe = require('./subscribe')
const { isClass } = require('./utils/validators')
const getHandledMessageTypes = require('./utils/getHandledMessageTypes')

/**
 * Aggregate command handler.
 *
 * Subscribes to event store and awaits aggregate commands.
 * Upon command receiving creates an instance of aggregate,
 * restores its state, passes command and commits emitted events to event store.
 */
class AggregateCommandHandler {
  /**
   * Creates an instance of AggregateCommandHandler.
   */
  constructor(options) {
    assert.ok(options.eventStore, 'options.eventStore')
    assert.ok(options.aggregateType, 'options.aggregateType')

    this._eventStore = options.eventStore

    if (isClass(options.aggregateType)) {
      const AggregateType = options.aggregateType
      this._aggregateFactory = params => new AggregateType(params)
      this._handles = getHandledMessageTypes(AggregateType)
    } else {
      this._aggregateFactory = options.aggregateType
      this._handles = options.handles
    }
  }

  /**
   * Subscribe to all command types handled by aggregateType
   */
  subscribe(commandBus) {
    subscribe(commandBus, this, {
      messageTypes: this._handles,
      masterHandler: this.execute
    })
  }

  /**
   * Restore aggregate from event store events
   */
  async _restoreAggregate(id) {
    assert.ok(id, 'id')
    const events = await this._eventStore.getAggregateEvents(id)
    const aggregate = this._aggregateFactory.call(null, { id, events })
    info('%s state restored from %s', aggregate, events)

    return aggregate
  }

  /**
   * Create new aggregate with new Id generated by event store
   */
  async _createAggregate() {
    const id = await this._eventStore.getNewId()
    const aggregate = this._aggregateFactory.call(null, { id })
    info('%s created', aggregate)

    return aggregate
  }

  /**
   * Pass a command to corresponding aggregate
   */
  async execute(cmd) {
    assert.ok(cmd, 'cmd')
    assert.ok(cmd.type, 'cmd.type')

    const aggregate = cmd.aggregateId
      ? await this._restoreAggregate(cmd.aggregateId)
      : await this._createAggregate()

    const handlerResponse = aggregate.handle(cmd)
    if (handlerResponse instanceof Promise) await handlerResponse

    let events = aggregate.changes
    info('%s "%s" command processed, %s produced', aggregate, cmd.type, events)

    /* istanbul ignore next */
    if (!events.length) return []

    if (aggregate.shouldTakeSnapshot && this._eventStore.snapshotsSupported) {
      aggregate.takeSnapshot()
      events = aggregate.changes
    }

    await this._eventStore.commit(events)

    return events
  }
}

module.exports = AggregateCommandHandler
