import assert from 'assert-plus'
import unique from './unique.js'
import getHandledMessageTypes from './getHandledMessageTypes.js'

/**
 * Subscribe observer to observable
 */
export default (observable, observer, options) => {
  assert.object(observable, 'observable')
  assert.func(observable.on, 'observable.on')
  assert.object(observer, 'observer')
  assert.object(options, 'options')
  assert.func(options.masterHandler, 'options.masterHandler')
  assert.ok(
    !(options.queueName && typeof observable.queue !== 'function'),
    'when options.queueName is specified observable.queue must be a Function'
  )

  const { masterHandler, messageTypes, queueName } = options
  const subscribeTo = messageTypes || getHandledMessageTypes(observer)
  assert.array(
    subscribeTo,
    'either options.messageTypes, observer.handles or ObserverType.handles is required'
  )

  for (const messageType of unique(subscribeTo)) {
    if (queueName) {
      observable.queue(queueName).on(messageType, masterHandler.bind(observer))
    } else {
      observable.on(messageType, masterHandler.bind(observer))
    }
  }
}
