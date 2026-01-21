import assert from 'assert-plus'

/**
 * Ensure messageBus matches the expected format
 */
export default (messageBus) => {
  assert.object(messageBus, 'messageBus')
  assert.func(messageBus.on, 'messageBus.on')
  assert.func(messageBus.publish, 'messageBus.publish')
}
