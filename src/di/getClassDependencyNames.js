'use strict'

const assert = require('assert-plus')

const PARAMETER_OBJECT_NAME = 'options'
const RX_CONSTRUCTOR = /(?:constructor|^function(?:.+\w+)?)\s?\(({?[^{})]*}?)\)\s?{/
const RX_PARAMETER_OBJECT = new RegExp(
  PARAMETER_OBJECT_NAME + '\\.([\\w]+)',
  'g'
)

function distinct(array) {
  return [...new Set(array)]
}

/**
 * Retrieves parameter object names mentioned in constructor body (e.g. "options.someService")
 * @param {String} classBody - either ES6 class or ES5 constructor function body
 * @param {Number} offset - where class/function body starts
 * @return {Array} - a list of object names (e.g. ["someService"])
 */
function* getParameterObjectPropertyNames(classBody, offset) {
  assert.string(classBody, 'classBody')
  assert.number(offset, 'offset')

  let ctorBody
  for (let i = offset, openedBrackets = 1; i < classBody.length; i++) {
    if (classBody[i] === '{') {
      openedBrackets += 1
    } else if (classBody[i] === '}' && --openedBrackets === 0) {
      ctorBody = classBody.substr(offset, i - offset - 1)
      break
    }
  }

  assert.ok(
    ctorBody,
    'constructor body could not be found, please do not use commented brackets in the constructor body'
  )

  let match
  while ((match = RX_PARAMETER_OBJECT.exec(ctorBody))) {
    yield match[1]
  }
}

/**
 * Retrieves constructor parameter names from a class descriptor.
 * If parameter is a paramenter object, its property names will be returned as inner array.
 *
 * @example
 * 	class X { constructor(options, service) { this._a = options.a; } }
 *  getClassDependencyNames(X) // => [["a"], "service"]
 *
 * @param  {Function} type Prototype function
 * @return {string[]}      An array with dependency names. In case of parameter object,
 *                         dependency will be an array too (e.g. [["someService", "anotherService"]])
 */
module.exports = function getClassDependencyNames(type) {
  assert.ok(type, 'type')
  assert.ok(type.prototype, 'type.prototype')

  const classBody = type.toString()
  const match = classBody.match(RX_CONSTRUCTOR)
  if (!match) {
    const parentType = Object.getPrototypeOf(type)

    if (parentType && parentType.prototype) {
      return getClassDependencyNames(parentType)
    }
    return null
  }

  const args = match[1]
  if (args.startsWith('{') && args.endsWith('}')) {
    // destructed parameter object
    return [
      args
        .replace(/^{|}$/g, '')
        .split(',')
        .map(n => n.trim())
    ]
  } else {
    const parameters = match[1]
      .split(',')
      .map(n => n.trim())
      .filter(n => n)
    return parameters.map(parameterName => {
      /* istanbul ignore else: @TODO needs unit test */
      if (parameterName === PARAMETER_OBJECT_NAME) {
        const constructorBodyOffset = match.index + match[0].length
        return distinct(
          Array.from(
            getParameterObjectPropertyNames(classBody, constructorBodyOffset)
          )
        )
      } else {
        return parameterName
      }
    })
  }
}
