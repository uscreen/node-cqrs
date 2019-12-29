const tap = require('tap')
const { createDomain } = require('../domain')
const { AbstractSaga } = require('../../index')

tap.test('Use Saga with default InMemoryLock', async t => {
  const { cqrs, eventsCollection } = await createDomain(t, 'sagaTest-')
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
  await t.test('write a command with cqrs.commandBus.send()', async t => {
    const id = null
    const payload = { body: 'Lorem Ipsum' }
    const context = { reqId: 1234 }
    await cqrs.commandBus.send('createEvent', id, { payload, context })
    const event = await cqrs.eventStore.once('EventCreated')
    aggregateId = event.aggregateId

    await cqrs.Views.once('EventCreated')
    await cqrs.Views.once('SomethingDone')
    await cqrs.Views.once('SomethingElseDone')

    const found = await eventsCollection.findOne({ aggregateId })

    t.same(
      aggregateId,
      found.aggregateId,
      'event should have been stored with given id'
    )
    t.ok(found.sagaId, 'event should have been stored with a sagaId')
    t.same(0, found.aggregateVersion, 'aggregateVersion should be 0')
    t.same(0, found.sagaVersion, 'sagaVersion should be 0')
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
    async t => {
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
