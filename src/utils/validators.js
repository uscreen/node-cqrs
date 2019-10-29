'use strict'

/**
 * module combines several functional validator methods
 */

const assert = require('assert-plus')
const getHandler = require('./getHandler')

/**
 * Ensure instance has handlers declared for all handled message types
 */
module.exports.validateHandlers = (instance, handlesFieldName = 'handles') => {
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

/**
 * Ensure messageBus matches the expected format
 */
module.exports.validateMessageBus = messageBus => {
  assert.object(messageBus, 'messageBus')
  assert.func(messageBus.on, 'messageBus.on')
  assert.func(messageBus.publish, 'messageBus.publish')
}

/**
 * Ensure snapshotStorage matches the expected format
 */
module.exports.validateSnapshotStorage = snapshotStorage => {
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

/**
 * Ensure provided eventStorage matches expected interface
 */
module.exports.validateEventStorage = storage => {
  assert.object(storage, 'storage')
  assert.func(storage.commitEvents, 'storage.commitEvents')
  assert.func(storage.getEvents, 'storage.getEvents')
  assert.func(storage.getAggregateEvents, 'storage.getAggregateEvents')
  assert.func(storage.getSagaEvents, 'storage.getSagaEvents')
  assert.func(storage.getNewId, 'storage.getNewId')
}

/**
 * Validate event structure
 */
module.exports.validateEvent = event => {
  assert.object(event, 'event')
  assert.string(event.type, 'event.type')

  assert.ok(
    event.aggregateId ||
      /* istanbul ignore next: @todo: write some unit test */ event.sagaId,
    'either event.aggregateId or event.sagaId is required'
  )

  assert.ok(
    !(event.sagaId && typeof event.sagaVersion === 'undefined'),
    'event.sagaVersion is required, when event.sagaId is defined'
  )
}

/**
 * returns true on functions creating a class
 */
module.exports.isClass = func => {
  return (
    typeof func === 'function' &&
    Function.prototype.toString.call(func).startsWith('class')
  )
}
