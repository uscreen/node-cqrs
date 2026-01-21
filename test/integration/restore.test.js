const { test } = require('node:test')
const assert = require('node:assert')
const { createDomain } = require('../domain')

// passed

test('Creating and using snapshots', async (t) => {
  const { cqrs, eventsCollection } = await createDomain(t, 'restore-')
  let aggregateId

  /**
   * 1st create
   */
  await t.test('write a command with cqrs.commandBus.commit()', async () => {
    const payload = { body: 'Lorem Ipsum' }
    const context = { reqId: 1234 }
    await cqrs.commandBus.commit('createEvent', null, { payload, context })
    const event = await cqrs.eventStore.once('EventCreated')
    aggregateId = event.aggregateId

    await cqrs.Views.once('EventCreated')

    const found = await eventsCollection.findOne({ aggregateId })
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
   * 1st update
   */
  await t.test('commit a change with cqrs.commandBus.commit()', async () => {
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
    assert.deepStrictEqual(
      view.id,
      aggregateId,
      'view id should match aggregateId'
    )
    assert.deepStrictEqual(view.body, 'Baba Luga', 'body should match payload')
  })

  /**
   * delete & restore views
   */
  await t.test(
    'deleted views should get restored by cqrs.Views.restore()',
    async () => {
      await cqrs.Views.clear()
      await cqrs.Views.restore()

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
    }
  )
})
