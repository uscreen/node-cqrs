const tap = require('tap')
const { createDomain } = require('../domain')

tap.test('Creating and using snapshots', async t => {
  const { cqrs, eventsCollection } = await createDomain(t, 'snapTest')
  let aggregateId

  /**
   * 1st create
   */
  await t.test('write a command with cqrs.commandBus.send()', async t => {
    const id = await cqrs.eventStore.getNewId()
    const payload = { body: 'Lorem Ipsum' }
    const context = { reqId: 1234 }
    await cqrs.commandBus.send('createEvent', id, { payload, context })
    await cqrs.eventStore.once('EventCreated')

    const found = await eventsCollection.findOne({ aggregateId: id })
    t.same('EventCreated', found.type, 'type should be "EventCreated"')
    t.same({ body: 'Lorem Ipsum' }, found.payload, 'body should match payload')
    t.same({ reqId: 1234 }, found.context, 'context should have provided data')

    aggregateId = id
    t.end()
  })

  /**
   * 1st update
   */
  await t.test('commit a change with cqrs.commandBus.send()', async t => {
    const payload = { body: 'Baba Luga' }
    const context = { reqId: 5678 }
    await cqrs.commandBus.send('changeEvent', aggregateId, { payload, context })
    await cqrs.eventStore.once('EventChanged')

    t.end()
  })

  t.end()
})
