const tap = require('tap')
const { MongoClient, ObjectId } = require('mongodb')
const { Container, MongoEventStorage } = require('../../index')
const { config } = require('../helper')

tap.test('Mongo-Connection', async t => {
  const client = await MongoClient.connect(config.mongoUri)
  const db = client.db()
  const collection = db.collection('insert-test')
  const events = db.collection('events-test-1')

  try {
    await collection.drop()
    await events.drop()
  } catch (_) {}

  const result = await collection.insertOne({ a: 1 })
  t.same(1, result.insertedCount)

  /**
   * -------
   */

  const cqrs = new Container()

  cqrs.register(MongoEventStorage, 'storage')
  cqrs.registerInstance({ events, ObjectId }, 'MongoEventStorageConfig')

  console.log(cqrs)

  client.close()
  t.end()
})
