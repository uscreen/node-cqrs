'use strict'

/**
 * returns true on functions creating a class
 */
module.exports = func => {
  return (
    typeof func === 'function' &&
    Function.prototype.toString.call(func).startsWith('class')
  )
}
