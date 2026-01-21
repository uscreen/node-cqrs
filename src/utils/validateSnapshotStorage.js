import assert from 'assert-plus'

/**
 * Ensure snapshotStorage matches the expected format
 */
export default (snapshotStorage) => {
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
