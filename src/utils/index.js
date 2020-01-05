'use strict'

module.exports.getClassName = require('./getClassName')
module.exports.getHandler = require('./getHandler')
module.exports.getHandledMessageTypes = require('./getHandledMessageTypes')
module.exports.getMessageHandlerNames = require('./getMessageHandlerNames')
module.exports.unique = arr => [...new Set(arr)]

module.exports.isClass = require('./isClass')
module.exports.validateEvent = require('./validateEvent')
