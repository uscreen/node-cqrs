/* eslint new-cap: "off" */
'use strict'

const assert = require('assert-plus')

const subscribe = require('./subscribe')
const { isClass } = require('./utils')
const info = require('debug')('cqrs:info')

/**
 * Listens to Saga events,
 * creates new saga or restores it from event store,
 * applies new events
 * and passes command(s) to command bus
 */
class SagaEventHandler {
  /**
   * Creates an instance of SagaEventHandler
   *
   * @param {object} options
   * @param {ISagaConstructor | ISagaFactory} options.sagaType
   * @param {IEventStore} options.eventStore
   * @param {ICommandBus} options.commandBus
   * @param {string} [options.queueName]
   * @param {string[]} [options.startsWith]
   * @param {string[]} [options.handles]
   */
  constructor(options) {
    assert.ok(options, 'options')
    assert.ok(options.sagaType, 'options.sagaType')
    assert.ok(options.eventStore, 'options.eventStore')
    assert.ok(options.commandBus, 'options.commandBus')

    this._eventStore = options.eventStore
    this._commandBus = options.commandBus
    this._queueName = options.queueName

    if (isClass(options.sagaType)) {
      const SagaType = options.sagaType

      this._sagaFactory = params => new SagaType(params)
      this._startsWith = SagaType.startsWith
      this._handles = SagaType.handles
    } else {
      assert.array(options.startsWith, 'options.startsWith')
      assert.array(options.handles, 'options.handles')

      this._sagaFactory = options.sagaType
      this._startsWith = options.startsWith
      this._handles = options.handles
    }

    this._eventStore.registerSagaStarters(options.startsWith)
  }

  /**
   * Overrides observer subscribe method
   */
  subscribe(eventStore) {
    subscribe(eventStore, this, {
      messageTypes: [...this._startsWith, ...this._handles],
      masterHandler: this.handle,
      queueName: this._queueName
    })
  }

  /**
   * Handle saga event
   *
   * @param {IEvent} event
   * @returns {Promise<void>}
   */
  async handle(event) {
    if (!event) throw new TypeError('event argument required')
    if (!event.type) throw new TypeError('event.type argument required')
    if (!event.sagaId) throw new TypeError('event.sagaId argument required')

    const saga = await this._restoreSaga(event)

    const r = saga.apply(event)
    if (r instanceof Promise) await r

    while (saga.uncommittedMessages.length) {
      const commands = saga.uncommittedMessages
      saga.resetUncommittedMessages()
      info(
        '%s "%s" event processed, %s produced',
        event.type,
        commands.map(c => c.type).join(',') || 'no commands'
      )

      for (const command of commands) {
        // attach event context to produced command
        if (command.context === undefined && event.context !== undefined)
          command.context = event.context

        try {
          await this._commandBus.sendRaw(command)
        } catch (err) {
          if (typeof saga.onError === 'function') {
            // let saga to handle the error
            saga.onError(err, { event, command })
          } else {
            throw err
          }
        }
      }
    }
  }

  /**
   * Restore saga from event store
   *
   * @param {IEvent} event Event that triggered saga execution
   * @returns {Promise<ISaga>}
   * @private
   */
  async _restoreSaga(event) {
    if (!event.sagaId) throw new TypeError('event.sagaId argument required')

    const events = await this._eventStore.getSagaEvents(event.sagaId, {
      beforeEvent: event
    })

    /** @type {ISaga} */
    const saga = this._sagaFactory.call(null, { id: event.sagaId, events })
    info('%s state restored from %s', saga, events)

    return saga
  }
}

module.exports = SagaEventHandler
