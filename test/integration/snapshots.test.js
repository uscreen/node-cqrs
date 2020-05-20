const tap = require('tap')
const { createDomain } = require('../domain')

// passed

tap.test('Creating and using snapshots', async (t) => {
  const { cqrs, eventsCollection, snapshotsCollection } = await createDomain(
    t,
    'snapTest-'
  )
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
    t.same('EventCreated', found.type, 'type should be "EventCreated"')
    t.same({ body: 'Lorem Ipsum' }, found.payload, 'body should match payload')
    t.same({ reqId: 1234 }, found.context, 'context should have provided data')

    t.end()
  })

  /**
   * 1st update
   */
  await t.test('commit a change with cqrs.commandBus.send()', async (t) => {
    const payload = { body: 'Baba Luga' }
    const context = { reqId: 5678 }
    await cqrs.commandBus.send('changeEvent', aggregateId, { payload, context })
    await cqrs.eventStore.once('EventChanged')
    await cqrs.Views.once('EventChanged')
    t.end()
  })

  /**
   * create some snapshots
   */
  await t.test(
    'commit a lot changes with cqrs.commandBus.send()',
    async (t) => {
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

      t.same(aggregateId, s[0].aggregateId, 'aggregateId should match')
      t.same(22, s[0].aggregateVersion, 'version should be 22')
      t.same('snapshot', s[0].type, 'type should be "snapshot"')
      t.same(
        { body: 'Baba Luga (18)' },
        s[0].payload,
        'body should match payload'
      )
      t.same({ reqId: 5678 }, s[0].context, 'context should have provided data')
      t.same(2, s.length, 'we should have found 2 snapshot now')
      t.end()
    }
  )

  /**
   * 2nd read
   */
  await t.test(
    'read that view from a projection with cqrs.views.read()',
    async (t) => {
      const view = await cqrs.Views.read(aggregateId)
      t.same(aggregateId, view.id, 'view id should match aggregateId')
      t.same('Baba Luga (19)', view.body, 'body should match payload')
      t.end()
    }
  )

  t.end()
})

tap.test('Should give same results without snapshots', async (t) => {
  const { cqrs, eventsCollection, snapshotsCollection } = await createDomain(
    t,
    'snapTest2',
    { skipSnapshot: true }
  )
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
    t.same('EventCreated', found.type, 'type should be "EventCreated"')
    t.same({ body: 'Lorem Ipsum' }, found.payload, 'body should match payload')
    t.same({ reqId: 1234 }, found.context, 'context should have provided data')

    t.end()
  })

  /**
   * 1st update
   */
  await t.test('commit a change with cqrs.commandBus.send()', async (t) => {
    const payload = { body: 'Baba Luga' }
    const context = { reqId: 5678 }
    await cqrs.commandBus.send('changeEvent', aggregateId, { payload, context })
    await cqrs.eventStore.once('EventChanged')
    await cqrs.Views.once('EventChanged')
    t.end()
  })

  /**
   * create some snapshots
   */
  await t.test(
    'commit a lot changes with cqrs.commandBus.send()',
    async (t) => {
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
      t.same(0, s.length, 'we should have found 0 snapshot this time')
      t.end()
    }
  )

  /**
   * 2nd read
   */
  await t.test(
    'read that view from a projection with cqrs.views.read()',
    async (t) => {
      const view = await cqrs.Views.read(aggregateId)
      t.same(aggregateId, view.id, 'view id should match aggregateId')
      t.same('Baba Luga (19)', view.body, 'body should match payload')
      t.end()
    }
  )

  t.end()
})
