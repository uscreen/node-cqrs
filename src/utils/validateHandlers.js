'use strict'

/**
 * module combines several functional validator methods
 */

const assert = require('assert-plus')
const getHandler = require('./getHandler')

/**
 * Ensure instance has handlers declared for all handled message types
 */
module.exports = (instance, handlesFieldName = 'handles') => {
  assert.ok(instance, 'instance')

  const messageTypes = Object.getPrototypeOf(instance).constructor[
    handlesFieldName
  ]
  if (messageTypes === undefined) return
  assert.array(
    messageTypes,
    'handles getter, when defined, must return an Array of Strings'
  )

  for (const type of messageTypes) {
    assert.func(
      getHandler(instance, type),
      `'${type}' handler is not defined or not a function`
    )
  }
}
