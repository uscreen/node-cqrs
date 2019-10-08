'use strict'

const InMemoryBus = require('./infrastructure/InMemoryMessageBus')
const debug = require('debug')('cqrs:debug:CommandBus')
const info = require('debug')('cqrs:info:CommandBus')

/**
 * @class CommandBus
 * @implements {ICommandBus}
 */
class CommandBus {
  /**
   * Creates an instance of CommandBus.
   *
   * @param {object} [options]
   * @param {IMessageBus} [options.messageBus]
   */
  constructor(options) {
    this._bus = (options && options.messageBus) || new InMemoryBus()
  }

  /**
   * Set up a command handler
   *
   * @param {string} commandType
   * @param {IMessageHandler} handler
   * @returns {any}
   */
  on(commandType, handler) {
    if (typeof commandType !== 'string' || !commandType.length)
      throw new TypeError('commandType argument must be a non-empty String')
    if (typeof handler !== 'function')
      throw new TypeError('handler argument must be a Function')

    return this._bus.on(commandType, handler)
  }

  /**
   * Format and send a command for execution
   */
  send(type, aggregateId, options) {
    if (typeof type !== 'string' || !type.length)
      throw new TypeError('type argument must be a non-empty String')
    if (typeof options !== 'object' || !options)
      throw new TypeError('options argument must be an Object')

    console.log(type, aggregateId, options)

    return this.sendRaw(Object.assign({ type, aggregateId }, options))
  }

  /**
   * Send a command for execution
   *
   * @param {ICommand} command
   * @returns {Promise<IEventStream>} - produced events
   */
  sendRaw(command) {
    if (!command) throw new TypeError('command argument required')
    if (!command.type) throw new TypeError('command.type argument required')

    debug(`sending '${command.type}' command...`)

    return this._bus.send(command).then(
      r => {
        debug(`'${command.type}' processed`)
        return r
      },
      err => {
        info(`'${command.type}' processing has failed: ${err}`)
        throw err
      }
    )
  }
}

module.exports = CommandBus
