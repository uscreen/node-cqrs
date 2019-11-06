'use strict'

const { validateMessageBus } = require('./utils/validators')
const debug = require('debug')('cqrs:debug:CommandBus')
const info = require('debug')('cqrs:info:CommandBus')

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
