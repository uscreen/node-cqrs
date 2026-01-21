import assert from 'assert-plus'

import { subscribe } from './utils/index.js'

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
    assert.ok(options.handles, 'options.handles')

    this._eventStore = options.eventStore
    this._aggregateFactory = options.aggregateType
    this._handles = options.handles
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
    const events = await this._eventStore.getAggregateEvents(id)
    return this._aggregateFactory.call(null, { id, events })
  }

  /**
   * Pass a command to corresponding aggregate
   */
  async execute(cmd) {
    assert.ok(cmd, 'cmd')
    assert.ok(cmd.type, 'cmd.type')

    const aggregate = cmd.aggregateId
      ? await this._restoreAggregate(cmd.aggregateId)
      : await this._aggregateFactory.call()

    const handlerResponse = aggregate.handle(cmd)
    if (handlerResponse instanceof Promise) await handlerResponse

    let events = aggregate.changes

    if (aggregate.shouldTakeSnapshot && this._eventStore.snapshotsSupported) {
      aggregate.takeSnapshot()
      events = aggregate.changes
    }

    await this._eventStore.commit(events)

    return events
  }
}

export default AggregateCommandHandler
