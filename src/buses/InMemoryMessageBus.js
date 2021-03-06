'use strict'

const assert = require('assert-plus')

/**
 * Default implementation of the message bus.
 * Keeps all subscriptions and messages in memory.
 */
module.exports = class InMemoryMessageBus {
  /**
   * Creates an instance of InMemoryMessageBus
   */
  constructor({ name, uniqueEventHandlers = !!name } = {}) {
    this._name = name
    this._uniqueEventHandlers = uniqueEventHandlers
    this._handlers = new Map()
    this._queues = new Map()
  }

  /**
   * Get or create a named queue.
   * Named queues support only one handler per event type.
   * used by sagas
   */
  queue(name) {
    /* istanbul ignore else: @TODO needs unit test */
    if (!this._queues.has(name)) {
      this._queues.set(
        name,
        new InMemoryMessageBus({ name, uniqueEventHandlers: true })
      )
    }

    return this._queues.get(name)
  }

  /**
   * Subscribe to message type
   */
  onCommand(messageType, handler) {
    assert.string(messageType, 'messageType')
    assert.func(handler, 'handler')

    // Events published to a named queue must be consumed only once.
    // For example, for sending a welcome email, NotificationReceptor will subscribe to "notifications:userCreated".
    // Since we use an in-memory bus, there is no need to track message handling by multiple distributed subscribers,
    // and we only need to make sure that no more than 1 such subscriber will be created
    /* istanbul ignore else: @TODO needs unit test */
    if (!this._handlers.has(messageType)) {
      this._handlers.set(messageType, new Set())
    } else if (this._uniqueEventHandlers) {
      throw new Error(
        `"${messageType}" handler is already set up on the "${this._name}" queue`
      )
    }

    this._handlers.get(messageType).add(handler)
  }

  /**
   * Subscribe to message type
   */
  on(messageType, handler) {
    assert.string(messageType, 'messageType')
    assert.func(handler, 'handler')

    // Events published to a named queue must be consumed only once.
    // For example, for sending a welcome email, NotificationReceptor will subscribe to "notifications:userCreated".
    // Since we use an in-memory bus, there is no need to track message handling by multiple distributed subscribers,
    // and we only need to make sure that no more than 1 such subscriber will be created
    /* istanbul ignore else: @TODO needs unit test */
    if (!this._handlers.has(messageType)) {
      this._handlers.set(messageType, new Set())
    } else if (this._uniqueEventHandlers) {
      throw new Error(
        `"${messageType}" handler is already set up on the "${this._name}" queue`
      )
    }

    this._handlers.get(messageType).add(handler)
  }

  /**
   * Send command to exactly 1 command handler
   */
  async send(command) {
    assert.object(command, 'command')
    assert.string(command.type, 'command.type')

    const handlers = this._handlers.get(command.type)
    assert.ok(
      handlers && handlers.size,
      `No '${command.type}' subscribers found`
    )
    assert.ok(
      handlers.size === 1, // or <==1
      `More than one '${command.type}' subscriber found`
    )

    const commandHandler = handlers.values().next().value

    return commandHandler(command)
  }

  /**
   * Publish event to all subscribers (if any)
   */
  async publish(event) {
    assert.object(event, 'event')
    assert.string(event.type, 'event.type')

    const handlers = [
      ...(this._handlers.get(event.type) || []),
      ...Array.from(this._queues.values()).map((namedQueue) => (e) =>
        namedQueue.publish(e)
      )
    ]

    return Promise.all(handlers.map((handler) => handler(event)))
  }
}
