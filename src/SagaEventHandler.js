import assert from 'assert-plus'
import { v4 as uuidv4 } from 'uuid'

import { subscribe } from './utils/index.js'

/**
 * Listens to Saga events,
 * creates new saga or restores it from event store,
 * applies new events
 * and passes command(s) to command bus
 */
class SagaEventHandler {
  /**
   * Creates an instance of SagaEventHandler
   */
  constructor(options) {
    assert.ok(options, 'options')
    assert.ok(options.sagaType, 'options.sagaType')
    assert.ok(options.eventStore, 'options.eventStore')
    assert.ok(options.commandBus, 'options.commandBus')
    assert.array(options.startsWith, 'options.startsWith')
    assert.array(options.handles, 'options.handles')

    this._eventStore = options.eventStore
    this._commandBus = options.commandBus
    this._queueName = options.queueName
    this._sagaFactory = options.sagaType
    this._startsWith = options.startsWith
    this._handles = options.handles

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
   */
  async handle(event) {
    assert.ok(event, 'event')
    assert.ok(event.type, 'event.type')

    if (this._startsWith.includes(event.type)) {
      // looks like we started
      event.sagaId = event.sagaId || `${this._queueName}-${uuidv4()}`
      event.sagaVersion = event.sagaVersion || 0
    }

    assert.ok(event.sagaId, 'event.sagaId')

    const saga = await this._restoreSaga(event)

    const r = saga.apply(event)
    /* istanbul ignore next */
    if (r instanceof Promise) await r

    while (saga.uncommittedMessages.length) {
      const commands = saga.uncommittedMessages
      saga.resetUncommittedMessages()

      for (const command of commands) {
        // attach event context to produced command
        /* istanbul ignore else */
        if (command.context === undefined && event.context !== undefined) {
          command.context = event.context
        }

        try {
          await this._commandBus.sendRaw(command)
        } catch (err) {
          /* istanbul ignore next */
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
   */
  async _restoreSaga(event) {
    assert.ok(event.sagaId)

    const events = await this._eventStore.getSagaEvents(event.sagaId, {
      beforeEvent: event
    })

    const saga = this._sagaFactory.call(null, { id: event.sagaId, events })

    return saga
  }
}

export default SagaEventHandler
