'use strict'

const envSchema = require('env-schema')

const schema = {
  type: 'object',
  properties: {
    mongoServer: {
      default: '127.0.0.1:27017'
    },
    redisHost: {
      default: '127.0.0.1'
    },
    natsHost: {
      default: '127.0.0.1'
    }
  }
}

const config = envSchema({
  schema,
  dotenv: true
})

const database = process.env.TAP
  ? `cqrs-kit-test-${process.env.TAP_CHILD_ID}`
  : 'cqrs-kit-test'

config.mongoUri = `mongodb://${config.mongoServer}/${database}`

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

module.exports = {
  config,
  wait
}
