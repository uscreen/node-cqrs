'use strict'

const assert = require('assert-plus')

const { validateHandlers, getHandler, getClassName } = require('./utils')

const _id = Symbol('id')
const _version = Symbol('version')
const _messages = Symbol('messages')

/**
 * Base class for Saga definition
 */
class AbstractSaga {
  /**
   * List of events that start new saga,
   * must be overridden in Saga implementation
   */
  static get startsWith() {
    assert.fail(
      'startsWith must be overriden to return a list of event types that start saga'
    )
  }

  /**
   * List of event types being handled by Saga,
   * must be overridden in Saga implementation
   */
  static get handles() {
    return []
  }

  /**
   * Saga ID
   */
  get id() {
    return this[_id]
  }

  /**
   * Saga version
   */
  get version() {
    return this[_version]
  }

  /**
   * Command execution queue
   */
  get uncommittedMessages() {
    return Array.from(this[_messages])
  }

  /**
   * Creates an instance of AbstractSaga
   */
  constructor(options) {
    assert.ok(options, 'options')
    assert.ok(options.id, 'options.id')

    this[_id] = options.id
    this[_version] = 0
    this[_messages] = []

    validateHandlers(this, 'startsWith')
    validateHandlers(this, 'handles')

    /* istanbul ignore else */
    if (options.events) {
      options.events.forEach(e => this.apply(e))
      this.resetUncommittedMessages()
    }

    Object.defineProperty(this, 'restored', { value: true })
  }

  /**
   * Modify saga state by applying an event
   */
  apply(event) {
    assert(event, 'event')
    assert(event.type, 'event.type')

    const handler = getHandler(this, event.type)
    assert.func(
      handler,
      `'${event.type}' handler is not defined or not a function`
    )

    const r = handler.call(this, event)
    if (r instanceof Promise) {
      return r.then(() => {
        this[_version] += 1
      })
    }

    this[_version] += 1
    return undefined
  }

  /**
   * Format a command and put it to the execution queue
   */
  enqueue(commandType, aggregateId, payload) {
    assert.string(commandType, 'commandType')

    assert.ok(
      ['string', 'number', 'undefined', 'object'].includes(typeof aggregateId),
      'aggregateId argument must be either string, number or undefined'
    )

    this.enqueueRaw({
      aggregateId,
      sagaId: this.id,
      sagaVersion: this.version,
      type: commandType,
      payload
    })
  }

  /**
   * Put a command to the execution queue
   */
  enqueueRaw(command) {
    assert.ok(command, 'command')
    assert.string(command.type, 'command.type')

    this[_messages].push(command)
  }

  /**
   * Clear the execution queue
   */
  resetUncommittedMessages() {
    this[_messages].length = 0
  }

  /**
   * Get human-readable Saga name
   */
  toString() {
    return `${getClassName(this)} ${this.id} (v${this.version})`
  }
}

module.exports = AbstractSaga
