const tap = require('tap')
const { MongoClient, ObjectId } = require('mongodb')
const {
  Container,
  AbstractAggregate,
  AbstractProjection,
  MongoView,
  MongoEventStorage
} = require('../../index')
const { config, wait } = require('../helper')

tap.test('MongoEventStorage', async t => {
  const client = await MongoClient.connect(config.mongoUri)
  const db = client.db()
  const collection = db.collection('insert-test')
  const events = db.collection('events-test-1')
  const views = db.collection('views-test-1')

  try {
    await collection.drop()
    await events.drop()
    await views.drop()
  } catch (_) {}

  const result = await collection.insertOne({ a: 1 })
  t.same(1, result.insertedCount)

  const cqrs = new Container()

  cqrs.register(MongoEventStorage, 'storage')
  cqrs.registerInstance(events, 'EventsCollection')
  cqrs.registerInstance(ObjectId, 'ObjectId')

  class State {
    EventCreated({ payload }) {
      this.body = payload.body
    }
  }

  class Aggregate extends AbstractAggregate {
    get state() {
      return this._state || (this._state = new State())
    }

    createEvent(payload) {
      this.emit('EventCreated', payload)
    }
  }
  cqrs.registerAggregate(Aggregate)

  class Views extends AbstractProjection {
    get view() {
      return (
        this._view ||
        (this._view = new MongoView({
          collection: views,
          ObjectId
        }))
      )
    }

    get shouldRestoreView() {
      return false
    }

    EventCreated({ aggregateId, payload }) {
      this.view.create(aggregateId, payload)
    }
  }
  cqrs.registerProjection(Views, 'Views')

  /**
   * create instances for DI
   * @todo find out about Unexposed vs. All
   */
  cqrs.createUnexposedInstances()
  cqrs.createAllInstances()

  let aggregateId

  /**
   * 1st write
   */
  await t.test('write a command with cqrs.commandBus.send()', async t => {
    const id = await cqrs.eventStore.getNewId()
    const payload = { body: 'Lorem Ipsum' }
    const context = { reqId: 1234 }
    await cqrs.commandBus.send('createEvent', id, { payload, context })

    const found = await events.findOne({ aggregateId: id })
    t.same(id, found.aggregateId, 'event should have been stored with given id')
    t.same(0, found.aggregateVersion, 'version should be 0')
    t.same('EventCreated', found.type, 'type should be "EventCreated"')
    t.same({ body: 'Lorem Ipsum' }, found.payload, 'body should match payload')
    t.same({ reqId: 1234 }, found.context, 'context should have provided data')

    aggregateId = id
    t.end()
  })

  /**
   * 1st read
   */
  await t.test(
    'read a view from a projection with cqrs.views.read()',
    async t => {
      /**
       * as cqrs acts async, we need a little time to wait for
       * views to catch up... @todo: find an event
       */
      await wait(100)
      const view = await cqrs.Views.read(aggregateId)
      t.same(
        aggregateId,
        view._id,
        'view should have been stored with given id'
      )
      t.same('Lorem Ipsum', view.body, 'body should match payload')
      t.end()
    }
  )

  client.close()
  t.end()
})
