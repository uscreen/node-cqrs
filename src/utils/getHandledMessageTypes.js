'use strict'

const assert = require('assert-plus')

const getMessageHandlerNames = require('./getMessageHandlerNames')

/**
 * Get a list of message types handled by observer
 */
function getHandledMessageTypes(observerInstanceOrClass) {
  assert.ok(observerInstanceOrClass, 'observerInstanceOrClass')

  /**
   * either by handles
   */
  if (observerInstanceOrClass.handles) {
    return observerInstanceOrClass.handles
  }

  /**
   * or by handles (proto?)
   */
  const prototype = Object.getPrototypeOf(observerInstanceOrClass)
  if (prototype && prototype.constructor && prototype.constructor.handles) {
    return prototype.constructor.handles
  }

  /**
   * or by method names (which I like most)
   */
  return getMessageHandlerNames(observerInstanceOrClass)
}

module.exports = getHandledMessageTypes
