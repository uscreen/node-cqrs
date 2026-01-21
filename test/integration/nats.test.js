import { test } from 'node:test'
import assert from 'node:assert'
import { createDomain } from '../domain.js'
// import { wait } from '../helper.js'
import { AbstractSaga } from '../../index.js'

test('Creating and using snapshots', async (t) => {
  const { cqrs, eventsCollection } = await createDomain(t, 'nats-', {
    useNatsBus: true
  })
  let aggregateId

  /**
   * add a saga
   */
  class Saga extends AbstractSaga {
    static get startsWith() {
      return ['EventCreated']
    }

    EventCreated(event) {
      this.enqueue('doSomething', event.aggregateId, event)
      this.enqueue('doSomethingElse', event.aggregateId, event)
    }
  }
  cqrs.registerSaga(Saga)

  /**
   * create instances for DI
   * @todo find out about Unexposed vs. All
   */
  cqrs.createUnexposedInstances()
  cqrs.createAllInstances()

  /**
   * 1st create
   */
  await t.test('write a command with cqrs.commandBus.send()', async () => {
    const payload = { body: 'Lorem Ipsum' }
    const context = { reqId: 1234 }
    await cqrs.commandBus.send('createEvent', null, { payload, context })
    const eventData = await cqrs.eventStore.once('EventCreated')
    aggregateId = eventData.aggregateId
    await Promise.all([
      cqrs.Views.once('EventCreated'),
      cqrs.Views.once('SomethingDone'),
      cqrs.Views.once('SomethingElseDone')
    ])

    const found = await eventsCollection.findOne({ aggregateId })

    assert.deepStrictEqual(
      found.aggregateId,
      aggregateId,
      'event should have been stored with given id'
    )

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
   * 1st read
   */
  await t.test(
    'read a view from a projection with cqrs.views.read()',
    async () => {
      const view = await cqrs.Views.read(aggregateId)

      assert.strictEqual(
        view.id,
        aggregateId,
        'view id should match aggregateId'
      )
      assert.strictEqual(view.body, 'Lorem Ipsum', 'body should match payload')

      assert.ok(view.stack.includes('SomethingDone'))
      assert.ok(view.stack.includes('SomethingElseDone'))
      assert.ok(view.SomethingDone)
      assert.ok(view.SomethingElseDone)
      assert.deepStrictEqual(
        view.stack,
        ['SomethingDone', 'SomethingElseDone'],
        'stack should be in exact order'
      )
    }
  )
})
