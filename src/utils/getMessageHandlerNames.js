import assert from 'assert-plus'

const KNOWN_METHOD_NAMES = new Set(['subscribe'])

/**
 * getInheritedPropertyNames
 */
const getInheritedPropertyNames = (prototype) => {
  const parentPrototype = prototype && Object.getPrototypeOf(prototype)
  if (!parentPrototype) return []

  const propDescriptors = Object.getOwnPropertyDescriptors(parentPrototype)
  const propNames = Object.keys(propDescriptors)

  return [...propNames, ...getInheritedPropertyNames(parentPrototype)]
}

/**
 * Get message handler names from a command/event handler class.
 * Assumes all private method names start from underscore ("_").
 */
const getMessageHandlerNames = (observerInstanceOrClass) => {
  assert.ok(observerInstanceOrClass, 'observerInstanceOrClass')

  const prototype =
    typeof observerInstanceOrClass === 'function'
      ? observerInstanceOrClass.prototype
      : Object.getPrototypeOf(observerInstanceOrClass)

  assert.ok(prototype, 'prototype  cannot be resolved')

  const inheritedProperties = new Set(getInheritedPropertyNames(prototype))
  const propDescriptors = Object.getOwnPropertyDescriptors(prototype)
  const propNames = Object.keys(propDescriptors)

  return propNames.filter(
    (key) =>
      !key.startsWith('_') &&
      !inheritedProperties.has(key) &&
      !KNOWN_METHOD_NAMES.has(key) &&
      typeof propDescriptors[key].value === 'function'
  )
}

export default getMessageHandlerNames
