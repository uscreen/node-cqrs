import { test } from 'node:test'
import assert from 'node:assert'
import { wait } from '../helper.js'
import { createDomain } from '../domain.js'

// passed

test('Use MongoEventStorage in a CRUD alike way', async (t) => {
  const { cqrs, eventsCollection, viewsCollection } = await createDomain(t)
  let aggregateId

  /**
   * 1st create
   */
  await t.test('write a command with cqrs.commandBus.send()', async () => {
    const payload = { body: 'Lorem Ipsum' }
    const context = { reqId: 1234 }
    await cqrs.commandBus.send('createEvent', null, { payload, context })
    const event = await cqrs.eventStore.once('EventCreated')
    aggregateId = event.aggregateId
    await cqrs.Views.once('EventCreated')

    const found = await eventsCollection.findOne({ aggregateId })
    assert.deepStrictEqual(
      found.aggregateId,
      aggregateId,
      'event should have been stored with given id'
    )
    assert.deepStrictEqual(found.aggregateVersion, 0, 'version should be 0')
    assert.ok(found.aggregateTimestamp, 'aggregateTimestamp should be present')
    assert.ok(
      found.aggregateId.startsWith('aggregate-'),
      'aggregateId should be prefixed with aggregate name'
    )
    assert.deepStrictEqual(
      found.type,
      'EventCreated',
      'type should be "EventCreated"'
    )
    assert.deepStrictEqual(
      found.payload,
      { body: 'Lorem Ipsum' },
      'body should match payload'
    )
    assert.deepStrictEqual(
      found.context,
      { reqId: 1234 },
      'context should have provided data'
    )
  })

  /**
   * 1st read
   */
  await t.test(
    'read a view from a projection with cqrs.views.read()',
    async () => {
      const view = await cqrs.Views.read(aggregateId)
      assert.deepStrictEqual(
        view.id,
        aggregateId,
        'view id should match aggregateId'
      )
      assert.deepStrictEqual(
        view.body,
        'Lorem Ipsum',
        'body should match payload'
      )

      const found = await viewsCollection.findOne(
        { id: aggregateId },
        { projection: { _id: false } }
      )

      assert.ok(found.created, 'created should be present')
      assert.deepStrictEqual(
        view,
        found,
        'view should be the same as read raw from mongo'
      )
    }
  )

  /**
   * 1st update
   */
  await t.test('commit a change with cqrs.commandBus.send()', async () => {
    const payload = { body: 'Baba Luga' }
    const context = { reqId: 5678 }
    await cqrs.commandBus.send('changeEvent', aggregateId, { payload, context })
    await cqrs.eventStore.once('EventChanged')
    await cqrs.Views.once('EventChanged')

    const e = await eventsCollection
      .find({ aggregateId }, { sort: 'aggregateVersion' })
      .toArray()

    assert.deepStrictEqual(e[0].aggregateVersion, 0, 'version should be 0')
    assert.deepStrictEqual(
      e[0].type,
      'EventCreated',
      'type should be "EventCreated"'
    )
    assert.deepStrictEqual(
      e[0].payload,
      { body: 'Lorem Ipsum' },
      'body should match payload'
    )
    assert.deepStrictEqual(
      e[0].context,
      { reqId: 1234 },
      'context should have provided data'
    )

    assert.deepStrictEqual(e[1].aggregateVersion, 1, 'version should be 1')
    assert.deepStrictEqual(
      e[1].type,
      'EventChanged',
      'type should be "EventChanged"'
    )
    assert.deepStrictEqual(
      e[1].payload,
      { body: 'Baba Luga' },
      'body should match payload'
    )
    assert.deepStrictEqual(
      e[1].context,
      { reqId: 5678 },
      'context should have provided data'
    )

    assert.deepStrictEqual(e.length, 2, 'we should have found 2 events now')
  })

  /**
   * 2nd read
   */
  await t.test(
    'read that view from a projection with cqrs.views.read()',
    async () => {
      const view = await cqrs.Views.read(aggregateId)
      assert.deepStrictEqual(
        view.id,
        aggregateId,
        'view id should match aggregateId'
      )
      assert.deepStrictEqual(
        view.body,
        'Baba Luga',
        'body should match payload'
      )
      const found = await viewsCollection.findOne(
        { id: aggregateId },
        { projection: { _id: false } }
      )
      assert.ok(found.modified, 'modified should be present')
      assert.ok(found.created, 'created should be present')
      assert.deepStrictEqual(
        view,
        found,
        'view should be the same as read raw from mongo'
      )
    }
  )

  /**
   * 1st list
   */
  await t.test('list all view without filter cqrs.views.list()', async () => {
    const views = await cqrs.Views.list()
    assert.deepStrictEqual(views.length, 1, 'we should have found 1 view now')
    assert.deepStrictEqual(
      views[0].id,
      aggregateId,
      'view id should match aggregateId'
    )
    assert.deepStrictEqual(
      views[0].body,
      'Baba Luga',
      'body should match payload'
    )
  })

  /**
   * 1st delete
   */
  await t.test('commit a remove with cqrs.commandBus.send()', async () => {
    const context = { reqId: 9012 }
    await cqrs.commandBus.send('deleteEvent', aggregateId, { context })
    await cqrs.eventStore.once('EventDeleted')
    await cqrs.Views.once('EventDeleted')

    const e = await eventsCollection
      .find({ aggregateId }, { sort: 'aggregateVersion' })
      .toArray()

    assert.deepStrictEqual(
      e[0].type,
      'EventCreated',
      'type should be "EventCreated"'
    )
    assert.deepStrictEqual(
      e[0].payload,
      { body: 'Lorem Ipsum' },
      'body should match payload'
    )
    assert.deepStrictEqual(
      e[0].context,
      { reqId: 1234 },
      'context should have provided data'
    )

    assert.deepStrictEqual(
      e[1].type,
      'EventChanged',
      'type should be "EventChanged"'
    )
    assert.deepStrictEqual(
      e[1].payload,
      { body: 'Baba Luga' },
      'body should match payload'
    )
    assert.deepStrictEqual(
      e[1].context,
      { reqId: 5678 },
      'context should have provided data'
    )

    assert.deepStrictEqual(
      e[2].type,
      'EventDeleted',
      'type should be "EventDeleted"'
    )
    assert.deepStrictEqual(e[2].payload, null, 'body should match payload')
    assert.deepStrictEqual(
      e[2].context,
      { reqId: 9012 },
      'context should have provided data'
    )

    assert.deepStrictEqual(e.length, 3, 'we should have found 3 events now')
  })

  /**
   * 2nd list
   */
  await t.test('list all view without filter after removal', async () => {
    const views = await cqrs.Views.list()
    assert.deepStrictEqual(views.length, 0, 'we should have found 0 view now')
  })

  /**
   * 3rd read
   */
  await t.test(
    'read that view from a projection with cqrs.views.read()',
    async () => {
      const view = await cqrs.Views.read(aggregateId)
      assert.deepStrictEqual(view, null, 'no view should have been found')

      const found = await viewsCollection.findOne({ id: aggregateId })
      assert.deepStrictEqual(found, null, 'no view exists in collection')
    }
  )

  /**
   * how about anotherView
   */
  await t.test(
    'read anotherView as a projection with cqrs.views.read()',
    async () => {
      await wait(200)
      const anotherView = await cqrs.AnotherViews.read(aggregateId)
      assert.ok(
        anotherView,
        'anotherView should still exist, as it is not subscribed to delete event'
      )
      assert.deepStrictEqual(
        aggregateId,
        anotherView.id,
        'anotherView id should match aggregateId'
      )
      assert.deepStrictEqual(
        'Baba Luga',
        anotherView.body,
        'anotherView body should match payload'
      )
    }
  )

  /**
   * how about a 3rd view
   */
  await t.test(
    'read ThirdProjection as a projection with cqrs.views.read() should still be of initial state',
    async () => {
      await wait(200)
      const ThirdProjection = await cqrs.ThirdProjection.read(aggregateId)
      assert.ok(
        ThirdProjection,
        'ThirdProjection should still exist, as it is not subscribed to delete event'
      )
      assert.deepStrictEqual(
        aggregateId,
        ThirdProjection.id,
        'ThirdProjection id should match aggregateId'
      )
      assert.deepStrictEqual(
        'Lorem Ipsum',
        ThirdProjection.body,
        'ThirdProjection body should match payload'
      )
      assert.deepStrictEqual(
        'thirdprojection',
        ThirdProjection.name,
        'ThirdProjection name should be "thirdprojection"'
      )
    }
  )
})
