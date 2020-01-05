'use strict'

const assert = require('assert-plus')

const InMemoryMessageBus = require('./InMemoryMessageBus')

/**
 * Default implementation of the message bus.
 * Keeps all subscriptions and messages in memory.
 */
module.exports = class NatsMessageBus {
  /**
   * Creates an instance of NatsMessageBus
   */
  constructor({ name, natsClient }) {
    this._name = name
    this._handlers = new Map()
    this._queues = new Map()
    this._nats = natsClient
  }

  _publish(type, event) {
    this._nats.publish(type, event)
  }

  _subscribe(type, handler) {
    this._nats.subscribe(type, handler)
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
    this._subscribe(messageType, handler)

    // Events published to a named queue must be consumed only once.
    // For example, for sending a welcome email, NotificationReceptor will subscribe to "notifications:userCreated".
    // Since we use an in-memory bus, there is no need to track message handling by multiple distributed subscribers,
    // and we only need to make sure that no more than 1 such subscriber will be created
    /* istanbul ignore next: @TODO needs unit test */
    if (this._uniqueEventHandlers && this._handlers.has(messageType)) {
      throw new Error(
        `"${messageType}" handler is already set up on the "${this._name}" queue`
      )
    }

    // no handlers assign yet, so create an empty set
    /* istanbul ignore else: @TODO needs unit test */
    if (!this._handlers.has(messageType)) {
      this._handlers.set(messageType, new Set())
    }

    // add handler to given messageType
    this._handlers.get(messageType).add(handler)
  }

  /**
   * Subscribe to message type
   */
  on(messageType, handler) {
    assert.string(messageType, 'messageType')
    assert.func(handler, 'handler')
    this._subscribe(messageType, handler)
  }

  /**
   * Send command to exactly 1 local command handler
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
    this._publish(event.type, event)

    // start sagas on events
    const sagaHandlers = Array.from(
      this._queues.values()
    ).map(namedQueue => e => namedQueue.publish(e))
    return Promise.all(sagaHandlers.map(handler => handler(event)))
  }
}
