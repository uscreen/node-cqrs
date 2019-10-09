'use strict'

const assert = require('assert-plus')

const { validateHandlers, getHandler, getClassName } = require('./utils')
const EventStream = require('./EventStream')

/**
 * Deep-clone simple JS object
 */
const clone = obj => JSON.parse(JSON.stringify(obj))

const SNAPSHOT_EVENT_TYPE = 'snapshot'

const _id = Symbol('id')
const _changes = Symbol('changes')
const _version = Symbol('version')
const _snapshotVersion = Symbol('snapshotVersion')

/**
 * Base class for Aggregate definition
 */
class AbstractAggregate {
  /**
   * List of commands handled by Aggregate. Can be overridden in aggregate implementation
   */
  static get handles() {
    return undefined
  }

  /**
   * Aggregate ID
   */
  get id() {
    return this[_id]
  }

  /**
   * Aggregate Version
   */
  get version() {
    return this[_version]
  }

  /**
   * Aggregate Snapshot Version
   */
  get snapshotVersion() {
    return this[_snapshotVersion]
  }

  /**
   * Events emitted by Aggregate command handlers
   */
  get changes() {
    return new EventStream(this[_changes])
  }

  /**
   * Override to define, whether an aggregate state snapshot should be taken
   */
  get shouldTakeSnapshot() {
    return false
  }

  /**
   * Creates an instance of AbstractAggregate.
   */
  constructor(options) {
    const { id, state, events } = options
    assert.ok(id, 'id')
    assert.optionalObject(state, 'state')
    assert.optionalArray(events, 'events')

    this[_id] = id
    this[_changes] = []
    this[_version] = 0
    this[_snapshotVersion] = 0

    validateHandlers(this)

    if (state) this.state = state
    if (events) events.forEach(event => this.mutate(event))
  }

  /**
   * Pass command to command handler
   */
  handle(command) {
    assert.ok(command, 'command')
    assert.ok(command.type, 'command.type')

    const handler = getHandler(this, command.type)
    assert.func(handler, `'${command.type}' handler`)
    this.command = command

    return handler.call(this, command.payload, command.context)
  }

  /**
   * Mutate aggregate state and increment aggregate version
   */
  mutate(event) {
    if ('aggregateVersion' in event) this[_version] = event.aggregateVersion

    if (event.type === SNAPSHOT_EVENT_TYPE) {
      this[_snapshotVersion] = event.aggregateVersion
      this.restoreSnapshot(event)
    } else if (this.state) {
      const handler = this.state.mutate || getHandler(this.state, event.type)
      if (handler) handler.call(this.state, event)
    }

    this[_version] += 1
  }

  /**
   * Format and register aggregate event and mutate aggregate state
   */
  emit(type, payload) {
    assert.string(type, 'type')
    const event = this.makeEvent(type, payload, this.command)
    this.emitRaw(event)
  }

  /**
   * (Re-)format event
   */
  makeEvent(type, payload, sourceCommand) {
    const event = {
      aggregateId: this.id,
      aggregateVersion: this.version,
      type,
      payload
    }

    if (sourceCommand) {
      const { context, sagaId, sagaVersion } = sourceCommand
      if (context !== undefined) event.context = context
      if (sagaId !== undefined) event.sagaId = sagaId
      if (sagaVersion !== undefined) event.sagaVersion = sagaVersion
    }

    return event
  }

  /**
   * Register aggregate event and mutate aggregate state
   */
  emitRaw(event) {
    assert.ok(event, 'event')
    assert.ok(event.aggregateId, 'event.aggregateId')
    assert.number(event.aggregateVersion, 'event.aggregateVersion')
    assert.string(event.type, 'event.type')

    this.mutate(event)
    this[_changes].push(event)
  }

  /**
   * Take an aggregate state snapshot and add it to the changes queue
   */
  takeSnapshot() {
    this.emit(SNAPSHOT_EVENT_TYPE, this.makeSnapshot())
  }

  /**
   * Create an aggregate state snapshot
   */
  makeSnapshot() {
    assert.ok(
      this.state,
      'state property is empty, either define state or override makeSnapshot method'
    )
    return clone(this.state)
  }

  /**
   * Restore aggregate state from a snapshot
   */
  restoreSnapshot(snapshotEvent) {
    assert.ok(snapshotEvent, 'snapshotEvent')
    assert.ok(snapshotEvent.type, 'snapshotEvent.type')
    assert.ok(snapshotEvent.payload, 'snapshotEvent.payload')
    assert.ok(
      snapshotEvent.type === SNAPSHOT_EVENT_TYPE,
      `${SNAPSHOT_EVENT_TYPE} event type expected`
    )
    assert.ok(
      this.state,
      'state property is empty, either define state or override makeSnapshot method'
    )

    Object.assign(this.state, clone(snapshotEvent.payload))
  }

  /**
   * Get human-readable aggregate identifier
   */
  toString() {
    return `${getClassName(this)} ${this.id} (v${this.version})`
  }
}

module.exports = AbstractAggregate
