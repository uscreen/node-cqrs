const tap = require('tap')
const { wait } = require('../helper')
const { createDomain, closeDb } = require('../domain')

tap.test('MongoEventStorage', async t => {
  const { cqrs, eventsCollection, viewsCollection } = await createDomain()
  let aggregateId

  /**
   * 1st write
   */
  await t.test('write a command with cqrs.commandBus.send()', async t => {
    const id = await cqrs.eventStore.getNewId()
    const payload = { body: 'Lorem Ipsum' }
    const context = { reqId: 1234 }
    await cqrs.commandBus.send('createEvent', id, { payload, context })

    const found = await eventsCollection.findOne({ aggregateId: id })
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

      const found = await viewsCollection.findOne({ _id: aggregateId })
      t.same(view, found, 'view should be the same as read raw from mongo')
      t.end()
    }
  )

  closeDb()
  t.end()
})
