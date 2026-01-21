import assert from 'assert-plus'

/**
 * Ensure provided eventStorage matches expected interface
 */
export default (storage) => {
  assert.object(storage, 'storage')
  assert.func(storage.commitEvents, 'storage.commitEvents')
  assert.func(storage.getEvents, 'storage.getEvents')
  assert.func(storage.getAggregateEvents, 'storage.getAggregateEvents')
  assert.func(storage.getSagaEvents, 'storage.getSagaEvents')
}
