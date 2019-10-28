const tap = require('tap')
const { createDomain } = require('../domain')
const { AbstractSaga } = require('../../index')

tap.test('Creating and using snapshots', async t => {
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
  await t.test('write a command with cqrs.commandBus.commit()', async t => {
    const payload = { body: 'Lorem Ipsum' }
    const context = { reqId: 1234 }

    await cqrs.commandBus.commit('createEvent', null, { payload, context })
    const event = await cqrs.eventStore.once('EventCreated')
    aggregateId = event.aggregateId

    await cqrs.Views.once('SomethingDone')
    await cqrs.Views.once('SomethingElseDone')

    const found = await eventsCollection.findOne({ aggregateId })
    t.same('EventCreated', found.type, 'type should be "EventCreated"')
    t.same({ body: 'Lorem Ipsum' }, found.payload, 'body should match payload')
    t.same({ reqId: 1234 }, found.context, 'context should have provided data')

    t.end()
  })

  /**
   * 1st update
   */
  await t.test('commit a change with cqrs.commandBus.commit()', async t => {
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
    console.log(view)
    t.same(aggregateId, view._id, 'view _id should match aggregateId')
    t.same('Baba Luga', view.body, 'body should match payload')
    t.ok(view.stack.includes('SomethingDone'))
    t.ok(view.stack.includes('SomethingElseDone'))
    t.ok(view.SomethingDone)
    t.ok(view.SomethingElseDone)
    t.end()
  })

  t.end()
})
