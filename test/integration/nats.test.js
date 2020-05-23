const tap = require('tap')
const { createDomain } = require('../domain')
// const { wait } = require('../helper')
const { AbstractSaga } = require('../../index')

tap.test('Creating and using snapshots', async (t) => {
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
  await t.test('write a command with cqrs.commandBus.send()', async (t) => {
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

    t.same(
      aggregateId,
      found.aggregateId,
      'event should have been stored with given id'
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

      t.ok(view.stack.includes('SomethingDone'))
      t.ok(view.stack.includes('SomethingElseDone'))
      t.ok(view.SomethingDone)
      t.ok(view.SomethingElseDone)
      t.same(
        ['SomethingDone', 'SomethingElseDone'],
        view.stack,
        'stack should be in exact order'
      )

      t.end()
    }
  )

  t.end()
})
