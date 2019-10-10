'use strict'

const assert = require('assert-plus')

/**
 * Gets a handler for a specific message type,
 * prefers a public (w\o _ prefix) method, if available
 */
module.exports = function getHandler(context, messageType) {
  assert.object(context, 'context')
  assert.string(messageType, 'messageType')

  if (messageType in context && typeof context[messageType] === 'function') {
    return context[messageType]
  }

  const privateHandlerName = `_${messageType}`

  /* istanbul ignore else */
  if (
    privateHandlerName in context &&
    typeof context[privateHandlerName] === 'function'
  ) {
    return context[privateHandlerName]
  } else {
    return null
  }
}
