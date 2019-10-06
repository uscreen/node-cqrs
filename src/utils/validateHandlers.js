'use strict'

const getHandler = require('./getHandler')

/**
 * Ensure instance has handlers declared for all handled message types
 *
 * @param {object} instance
 */
function validateHandlers(instance, handlesFieldName = 'handles') {
  if (!instance) throw new TypeError('instance argument required')

  const messageTypes = Object.getPrototypeOf(instance).constructor[
    handlesFieldName
  ]
  if (messageTypes === undefined) return
  if (!Array.isArray(messageTypes))
    throw new TypeError(
      'handles getter, when defined, must return an Array of Strings'
    )

  for (const type of messageTypes) {
    if (!getHandler(instance, type))
      throw new Error(`'${type}' handler is not defined or not a function`)
  }
}

module.exports = validateHandlers
