'use strict'

const assert = require('assert-plus')

/**
 * Ensure snapshotStorage matches the expected format
 */
module.exports = snapshotStorage => {
  assert.object(snapshotStorage, 'snapshotStorage')
  assert.func(
    snapshotStorage.getAggregateSnapshot,
    'snapshotStorage.getAggregateSnapshot'
  )
  assert.func(
    snapshotStorage.saveAggregateSnapshot,
    'snapshotStorage.saveAggregateSnapshot'
  )
}
