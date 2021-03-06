const tap = require('tap')
const { wait } = require('../helper')
const { createDomain } = require('../domain')

// passed

tap.test('Use MongoEventStorage in a CRUD alike way', async (t) => {
  const { cqrs, eventsCollection, viewsCollection } = await createDomain(t)
  let aggregateId

  /**
   * 1st create
   */
  await t.test('write a command with cqrs.commandBus.send()', async (t) => {
    const payload = { body: 'Lorem Ipsum' }
    const context = { reqId: 1234 }
    await cqrs.commandBus.send('createEvent', null, { payload, context })
    const event = await cqrs.eventStore.once('EventCreated')
    aggregateId = event.aggregateId
    await cqrs.Views.once('EventCreated')

    const found = await eventsCollection.findOne({ aggregateId })
    t.same(
      aggregateId,
      found.aggregateId,
      'event should have been stored with given id'
    )
    t.same(0, found.aggregateVersion, 'version should be 0')
    t.ok(found.aggregateTimestamp, 'aggregateTimestamp should be present')
    t.ok(
      found.aggregateId.startsWith('aggregate-'),
      'aggregateId should be prefixed with aggregate name'
    )
    t.same('EventCreated', found.type, 'type should be "EventCreated"')
    t.same({ body: 'Lorem Ipsum' }, found.payload, 'body should match payload')
    t.same({ reqId: 1234 }, found.context, 'context should have provided data')

    t.end()
  })

  /**
   * 1st read
   */
  await t.test(
    'read a view from a projection with cqrs.views.read()',
    async (t) => {
      const view = await cqrs.Views.read(aggregateId)
      t.same(aggregateId, view.id, 'view id should match aggregateId')
      t.same('Lorem Ipsum', view.body, 'body should match payload')

      const found = await viewsCollection.findOne(
        { id: aggregateId },
        { projection: { _id: false } }
      )

      t.ok(found.created, 'created should be present')
      t.same(view, found, 'view should be the same as read raw from mongo')
      t.end()
    }
  )

  /**
   * 1st update
   */
  await t.test('commit a change with cqrs.commandBus.send()', async (t) => {
    const payload = { body: 'Baba Luga' }
    const context = { reqId: 5678 }
    await cqrs.commandBus.send('changeEvent', aggregateId, { payload, context })
    await cqrs.eventStore.once('EventChanged')
    await cqrs.Views.once('EventChanged')

    const e = await eventsCollection
      .find({ aggregateId }, { sort: 'aggregateVersion' })
      .toArray()

    t.same(0, e[0].aggregateVersion, 'version should be 0')
    t.same('EventCreated', e[0].type, 'type should be "EventCreated"')
    t.same({ body: 'Lorem Ipsum' }, e[0].payload, 'body should match payload')
    t.same({ reqId: 1234 }, e[0].context, 'context should have provided data')

    t.same(1, e[1].aggregateVersion, 'version should be 1')
    t.same('EventChanged', e[1].type, 'type should be "EventChanged"')
    t.same({ body: 'Baba Luga' }, e[1].payload, 'body should match payload')
    t.same({ reqId: 5678 }, e[1].context, 'context should have provided data')

    t.same(2, e.length, 'we should have found 2 events now')

    t.end()
  })

  /**
   * 2nd read
   */
  await t.test(
    'read that view from a projection with cqrs.views.read()',
    async (t) => {
      const view = await cqrs.Views.read(aggregateId)
      t.same(aggregateId, view.id, 'view id should match aggregateId')
      t.same('Baba Luga', view.body, 'body should match payload')
      const found = await viewsCollection.findOne(
        { id: aggregateId },
        { projection: { _id: false } }
      )
      t.ok(found.modified, 'modified should be present')
      t.ok(found.created, 'created should be present')
      t.same(view, found, 'view should be the same as read raw from mongo')
      t.end()
    }
  )

  /**
   * 1st list
   */
  await t.test('list all view without filter cqrs.views.list()', async (t) => {
    const views = await cqrs.Views.list()
    t.same(1, views.length, 'we should have found 1 view now')
    t.same(aggregateId, views[0].id, 'view id should match aggregateId')
    t.same('Baba Luga', views[0].body, 'body should match payload')
    t.end()
  })

  /**
   * 1st delete
   */
  await t.test('commit a remove with cqrs.commandBus.send()', async (t) => {
    const context = { reqId: 9012 }
    await cqrs.commandBus.send('deleteEvent', aggregateId, { context })
    await cqrs.eventStore.once('EventDeleted')
    await cqrs.Views.once('EventDeleted')

    const e = await eventsCollection
      .find({ aggregateId }, { sort: 'aggregateVersion' })
      .toArray()

    t.same('EventCreated', e[0].type, 'type should be "EventCreated"')
    t.same({ body: 'Lorem Ipsum' }, e[0].payload, 'body should match payload')
    t.same({ reqId: 1234 }, e[0].context, 'context should have provided data')

    t.same('EventChanged', e[1].type, 'type should be "EventChanged"')
    t.same({ body: 'Baba Luga' }, e[1].payload, 'body should match payload')
    t.same({ reqId: 5678 }, e[1].context, 'context should have provided data')

    t.same('EventDeleted', e[2].type, 'type should be "EventDeleted"')
    t.same(null, e[2].payload, 'body should match payload')
    t.same({ reqId: 9012 }, e[2].context, 'context should have provided data')

    t.same(3, e.length, 'we should have found 3 events now')

    t.end()
  })

  /**
   * 2nd list
   */
  await t.test('list all view without filter after removal', async (t) => {
    const views = await cqrs.Views.list()
    t.same(0, views.length, 'we should have found 0 view now')
    t.end()
  })

  /**
   * 3rd read
   */
  await t.test(
    'read that view from a projection with cqrs.views.read()',
    async (t) => {
      const view = await cqrs.Views.read(aggregateId)
      t.same(null, view, 'no view should have been found')

      const found = await viewsCollection.findOne({ id: aggregateId })
      t.same(null, found, 'no view exists in collection')

      t.end()
    }
  )

  /**
   * how about anotherView
   */
  await t.test(
    'read anotherView as a projection with cqrs.views.read()',
    async (t) => {
      await wait(200)
      const anotherView = await cqrs.AnotherViews.read(aggregateId)
      t.ok(
        anotherView,
        'anotherView should still exist, as it is not subscribed to delete event'
      )
      t.same(
        aggregateId,
        anotherView.id,
        'anotherView id should match aggregateId'
      )
      t.same(
        'Baba Luga',
        anotherView.body,
        'anotherView body should match payload'
      )

      t.end()
    }
  )

  /**
   * how about a 3rd view
   */
  await t.test(
    'read ThirdProjection as a projection with cqrs.views.read() should still be of initial state',
    async (t) => {
      await wait(200)
      const ThirdProjection = await cqrs.ThirdProjection.read(aggregateId)
      t.ok(
        ThirdProjection,
        'ThirdProjection should still exist, as it is not subscribed to delete event'
      )
      t.same(
        aggregateId,
        ThirdProjection.id,
        'ThirdProjection id should match aggregateId'
      )
      t.same(
        'Lorem Ipsum',
        ThirdProjection.body,
        'ThirdProjection body should match payload'
      )
      t.same(
        'thirdprojection',
        ThirdProjection.name,
        'ThirdProjection name should be "thirdprojection"'
      )

      t.end()
    }
  )

  t.end()
})
