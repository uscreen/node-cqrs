'use strict'

const { validateMessageBus } = require('./utils')

class CommandBus {
  /**
   * Creates an instance of CommandBus.
   */
  constructor(options) {
    validateMessageBus(options.messageBus)
    this._bus = options.messageBus
  }

  /**
   * Set up a command handler
   */
  on(commandType, handler) {
    return this._bus.onCommand(commandType, handler)
  }

  /**
   * Format and send a command for execution
   * alias to send
   */
  commit(type, aggregateId, options) {
    return this.sendRaw(Object.assign({ type, aggregateId }, options))
  }

  /**
   * Format and send a command for execution
   * alias to commit
   */
  send(type, aggregateId, options) {
    return this.commit(type, aggregateId, options)
  }

  /**
   * Format and send a command for execution
   * @param {string} type type of command, ie. 'Something.add'
   * @param {object} payload containing: { payload, context }
   */
  submit(type, payload) {
    return this._bus.send({
      type,
      ...payload
    })
  }

  /**
   * Send a command for execution
   */
  sendRaw(command) {
    return this._bus.send(command)
  }
}

module.exports = CommandBus
