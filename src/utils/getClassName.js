'use strict'

/**
 * Get instance class name
 */
module.exports = instance => Object.getPrototypeOf(instance).constructor.name
