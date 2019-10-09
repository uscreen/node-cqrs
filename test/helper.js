'use strict'

const envSchema = require('env-schema')

const schema = {
  type: 'object',
  properties: {
    mongoServer: {
      default: '127.0.0.1:27017'
    }
  }
}

const config = envSchema({
  schema: schema,
  dotenv: true
})

const database = process.env.TAP
  ? `cqrs-kit-test-${process.env.TAP_CHILD_ID}`
  : 'cqrs-kit-test'

config.mongoUri = `mongodb://${config.mongoServer}/${database}`

module.exports = {
  config
}
