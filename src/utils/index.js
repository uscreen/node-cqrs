'use strict'

exports.getClassName = require('./getClassName')
exports.getHandler = require('./getHandler')
exports.getHandledMessageTypes = require('./getHandledMessageTypes')

exports.unique = arr => [...new Set(arr)]
