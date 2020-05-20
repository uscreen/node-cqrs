const tap = require('tap')
const { createDomain } = require('../domain')

// passed

tap.test('Creating and using snapshots', async (t) => {
  const { cqrs, eventsCollection } = await createDomain(t, 'restore-')
  let aggregateId

  /**
   * 1st create
   */
  await t.test('write a command with cqrs.commandBus.commit()', async (t) => {
    const payload = { body: 'Lorem Ipsum' }
    const context = { reqId: 1234 }
    await cqrs.commandBus.commit('createEvent', null, { payload, context })
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
  await t.test('commit a change with cqrs.commandBus.commit()', async (t) => {
    const payload = { body: 'Baba Luga' }
    const context = { reqId: 5678 }
    await cqrs.commandBus.commit('changeEvent', aggregateId, {
      payload,
      context
    })
    const event = await cqrs.eventStore.once('EventChanged')
    aggregateId = event.aggregateId

    await cqrs.Views.once('EventChanged')

    const view = await cqrs.Views.read(aggregateId)
    t.same(aggregateId, view.id, 'view id should match aggregateId')
    t.same('Baba Luga', view.body, 'body should match payload')
    t.end()
  })

  /**
   * delete & restore views
   */
  await t.test(
    'deleted views should get restored by cqrs.Views.restore()',
    async (t) => {
      await cqrs.Views.clear()
      await cqrs.Views.restore()

      const view = await cqrs.Views.read(aggregateId)
      t.same(aggregateId, view.id, 'view id should match aggregateId')
      t.same('Baba Luga', view.body, 'body should match payload')
      t.end()
    }
  )

  t.end()
})
