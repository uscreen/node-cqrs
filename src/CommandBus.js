'use strict'

const InMemoryBus = require('./buses/InMemoryMessageBus')
const debug = require('debug')('cqrs:debug:CommandBus')
const info = require('debug')('cqrs:info:CommandBus')

class CommandBus {
  /**
   * Creates an instance of CommandBus.
   */
  constructor(options) {
    this._bus = (options && options.messageBus) || new InMemoryBus()
  }

  /**
   * Set up a command handler
   */
  on(commandType, handler) {
    return this._bus.on(commandType, handler)
  }

  /**
   * Format and send a command for execution
   */
  send(type, aggregateId, options) {
    return this.sendRaw(Object.assign({ type, aggregateId }, options))
  }

  /**
   * Send a command for execution
   */
  sendRaw(command) {
    debug(`sending '${command.type}' command...`)
    return this._bus.send(command).then(
      r => {
        debug(`'${command.type}' processed`)
        return r
      },
      /* istanbul ignore next */
      err => {
        info(`'${command.type}' processing has failed: ${err}`)
        throw err
      }
    )
  }
}

module.exports = CommandBus
