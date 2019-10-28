'use strict'

const assert = require('assert-plus')
const { getHandler } = require('./utils')
const getHandledMessageTypes = require('./utils/getHandledMessageTypes')

const unique = arr => [...new Set(arr)]

/**
 * Subscribe observer to observable
 */
function subscribe(
  observable,
  observer,
  /* istanbul ignore next */
  options = {}
) {
  assert.object(observable, 'observable')
  assert.func(observable.on, 'observable.on')
  assert.object(observer, 'observer')

  const { masterHandler, messageTypes, queueName } = options

  assert.func(masterHandler, 'masterHandler')
  assert.ok(
    !(queueName && typeof observable.queue !== 'function'),
    'observable.queue, when queueName is specified, must be a Function'
  )

  const subscribeTo = messageTypes || getHandledMessageTypes(observer)

  assert.array(
    subscribeTo,
    'either options.messageTypes, observer.handles or ObserverType.handles is required'
  )

  for (const messageType of unique(subscribeTo)) {
    const handler =
      masterHandler ||
      /* istanbul ignore next */
      getHandler(observer, messageType)
    assert.func(handler, 'handler')

    if (queueName) {
      observable.queue(queueName).on(messageType, handler.bind(observer))
    } else {
      observable.on(messageType, handler.bind(observer))
    }
  }
}

module.exports = subscribe
