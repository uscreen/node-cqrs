'use strict'

const assert = require('assert-plus')

/**
 * Ensure messageBus matches the expected format
 */
module.exports = messageBus => {
  assert.object(messageBus, 'messageBus')
  assert.func(messageBus.on, 'messageBus.on')
  assert.func(messageBus.publish, 'messageBus.publish')
}
