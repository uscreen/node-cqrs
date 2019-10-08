'use strict'

const assert = require('assert').strict

assert.isObject = (thing, message) => {
  assert(typeof thing === 'object', message)
}

module.exports = assert
