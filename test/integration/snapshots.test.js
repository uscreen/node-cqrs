import { test } from 'node:test'
import assert from 'node:assert'
import { createDomain } from '../domain.js'

// passed

test('Creating and using snapshots', async (t) => {
  const { cqrs, eventsCollection, snapshotsCollection } = await createDomain(
    t,
    'snapTest-'
  )
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
    assert.strictEqual(
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
   * 1st update
   */
  await t.test('commit a change with cqrs.commandBus.send()', async () => {
    const payload = { body: 'Baba Luga' }
    const context = { reqId: 5678 }
    await cqrs.commandBus.send('changeEvent', aggregateId, { payload, context })
    await cqrs.eventStore.once('EventChanged')
    await cqrs.Views.once('EventChanged')
  })

  /**
   * create some snapshots
   */
  await t.test('commit a lot changes with cqrs.commandBus.send()', async () => {
    const context = { reqId: 5678 }

    for (let index = 0; index < 20; index++) {
      const payload = { body: `Baba Luga (${index})` }
      await cqrs.commandBus.send('changeEvent', aggregateId, {
        payload,
        context
      })
      await cqrs.eventStore.once('EventChanged')
      await cqrs.Views.once('EventChanged')
    }

    const s = await snapshotsCollection
      .find()
      .sort({ aggregateVersion: -1 })
      .toArray()

    assert.strictEqual(
      s[0].aggregateId,
      aggregateId,
      'aggregateId should match'
    )
    assert.strictEqual(s[0].aggregateVersion, 22, 'version should be 22')
    assert.strictEqual(s[0].type, 'snapshot', 'type should be "snapshot"')
    assert.deepStrictEqual(
      s[0].payload,
      { body: 'Baba Luga (18)' },
      'body should match payload'
    )
    assert.deepStrictEqual(
      s[0].context,
      { reqId: 5678 },
      'context should have provided data'
    )
    assert.strictEqual(s.length, 2, 'we should have found 2 snapshot now')
  })

  /**
   * 2nd read
   */
  await t.test(
    'read that view from a projection with cqrs.views.read()',
    async () => {
      const view = await cqrs.Views.read(aggregateId)
      assert.strictEqual(
        view.id,
        aggregateId,
        'view id should match aggregateId'
      )
      assert.strictEqual(
        view.body,
        'Baba Luga (19)',
        'body should match payload'
      )
    }
  )
})

test('Should give same results without snapshots', async (t) => {
  const { cqrs, eventsCollection, snapshotsCollection } = await createDomain(
    t,
    'snapTest2',
    { skipSnapshot: true }
  )
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
    assert.strictEqual(
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
   * 1st update
   */
  await t.test('commit a change with cqrs.commandBus.send()', async () => {
    const payload = { body: 'Baba Luga' }
    const context = { reqId: 5678 }
    await cqrs.commandBus.send('changeEvent', aggregateId, { payload, context })
    await cqrs.eventStore.once('EventChanged')
    await cqrs.Views.once('EventChanged')
  })

  /**
   * create some snapshots
   */
  await t.test('commit a lot changes with cqrs.commandBus.send()', async () => {
    const context = { reqId: 5678 }

    for (let index = 0; index < 20; index++) {
      const payload = { body: `Baba Luga (${index})` }
      await cqrs.commandBus.send('changeEvent', aggregateId, {
        payload,
        context
      })
      await cqrs.eventStore.once('EventChanged')
      await cqrs.Views.once('EventChanged')
    }

    const s = await snapshotsCollection.find().toArray()
    assert.strictEqual(s.length, 0, 'we should have found 0 snapshot this time')
  })

  /**
   * 2nd read
   */
  await t.test(
    'read that view from a projection with cqrs.views.read()',
    async () => {
      const view = await cqrs.Views.read(aggregateId)
      assert.strictEqual(
        view.id,
        aggregateId,
        'view id should match aggregateId'
      )
      assert.strictEqual(
        view.body,
        'Baba Luga (19)',
        'body should match payload'
      )
    }
  )
})
