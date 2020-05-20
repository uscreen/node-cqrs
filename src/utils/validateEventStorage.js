'use strict'

const assert = require('assert-plus')

/**
 * Ensure provided eventStorage matches expected interface
 */
module.exports = (storage) => {
  assert.object(storage, 'storage')
  assert.func(storage.commitEvents, 'storage.commitEvents')
  assert.func(storage.getEvents, 'storage.getEvents')
  assert.func(storage.getAggregateEvents, 'storage.getAggregateEvents')
  assert.func(storage.getSagaEvents, 'storage.getSagaEvents')
}
