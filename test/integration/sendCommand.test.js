const tap = require('tap')
const { MongoClient } = require('mongodb')
const { config } = require('../helper')

tap.test('Mongo-Connection', async t => {
  const client = await MongoClient.connect(config.mongoUri)
  const db = client.db()
  const collection = db.collection('insert-test')

  try {
    await collection.drop()
  } catch (_) {}

  const result = await collection.insertOne({ a: 1 })
  t.same(1, result.insertedCount)

  /**
   * -------
   */

  client.close()
  t.end()
})
