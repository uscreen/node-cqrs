const { MongoClient, ObjectId } = require('mongodb')
const {
  Container,
  AbstractAggregate,
  AbstractProjection,
  MongoView,
  MongoEventStorage,
  MongoSnapshotStorage,
  InMemoryMessageBus,
  NatsMessageBus
} = require('../index')
const { config, wait } = require('./helper')

const createDomain = async (
  t,
  ns = 'test',
  { skipSnapshot, useNatsBus } = {}
) => {
  const client = await MongoClient.connect(config.mongoUri)
  const db = client.db()
  const eventsCollection = db.collection(`${ns}-events`)
  const snapshotsCollection = db.collection(`${ns}-snapshots`)
  const viewsCollection = db.collection(`${ns}-views`)
  const anotherViewsCollection = db.collection(`${ns}-another-views`)
  const ThirdProjectionCollection = db.collection(`${ns}-ThirdProjection-views`)

  try {
    await eventsCollection.drop()
    await snapshotsCollection.drop()
    await viewsCollection.drop()
    await anotherViewsCollection.drop()
    await ThirdProjectionCollection.drop()
  } catch (_) {}

  t.teardown(async () => {
    await client.close()
  })

  await wait(200)

  const cqrs = new Container()

  cqrs.register(MongoEventStorage, 'storage')
  if (useNatsBus) {
    cqrs.register(NatsMessageBus, 'messageBus')
  } else {
    cqrs.register(InMemoryMessageBus, 'messageBus')
  }

  if (!skipSnapshot) {
    cqrs.register(MongoSnapshotStorage, 'snapshotStorage')
  }
  cqrs.registerInstance(eventsCollection, 'EventsCollection')
  cqrs.registerInstance(snapshotsCollection, 'SnapshotsCollection')
  cqrs.registerInstance(ObjectId, 'ObjectId')

  class State {
    EventCreated({ payload }) {
      this.body = payload.body
    }

    EventChanged({ payload }) {
      this.body = payload.body
    }

    EventDeleted() {
      this.body = ''
    }
  }

  class Aggregate extends AbstractAggregate {
    constructor(options) {
      super({ state: new State(), ...options })
    }

    get shouldTakeSnapshot() {
      return this.version - this.snapshotVersion > 10
    }

    async createEvent(payload) {
      this.emit('EventCreated', payload)
    }

    changeEvent(payload) {
      this.emit('EventChanged', payload)
    }

    async deleteEvent() {
      await wait(10)
      this.emit('EventDeleted')
    }

    async doSomething(payload) {
      return this.emit('SomethingDone', payload)
    }

    async doSomethingElse(payload) {
      this.emit('SomethingElseDone', payload)
    }
  }
  cqrs.registerAggregate(Aggregate)

  class Views extends AbstractProjection {
    constructor({ eventStore }) {
      super({
        eventStore,
        view: new MongoView({
          collection: viewsCollection,
          ObjectId
        })
      })
    }

    get shouldRestoreView() {
      return false
    }

    EventCreated({ aggregateId, payload }) {
      return this.view.create(aggregateId, payload)
    }

    EventChanged({ aggregateId, payload }) {
      return this.view.update(aggregateId, payload)
    }

    async EventDeleted({ aggregateId }) {
      await this.view.delete(aggregateId)
    }

    async SomethingDone({ aggregateId }) {
      await this.view.update(aggregateId, { SomethingDone: true })
      await this.view.collection.findOneAndUpdate(
        { _id: aggregateId },
        { $push: { stack: 'SomethingDone' } }
      )
    }

    async SomethingElseDone({ aggregateId }) {
      await this.view.update(aggregateId, { SomethingElseDone: true })
      await this.view.collection.findOneAndUpdate(
        { _id: aggregateId },
        { $push: { stack: 'SomethingElseDone' } }
      )
    }
  }
  cqrs.registerProjection(Views, 'Views')

  class AnotherViews extends AbstractProjection {
    constructor({ eventStore }) {
      super({
        eventStore,
        view: new MongoView({
          collection: anotherViewsCollection,
          ObjectId
        })
      })
    }

    static get handles() {
      return ['EventCreated', 'EventChanged']
    }

    EventCreated({ aggregateId, payload }) {
      this.view.create(aggregateId, payload)
    }

    /**
     * underscore prefixed should handled too
     */
    _EventChanged({ aggregateId, payload }) {
      this.view.update(aggregateId, payload)
    }

    /**
     * unlisteted handles should get used
     */
    EventDeleted({ aggregateId }) {
      this.view.delete(aggregateId)
    }
  }
  cqrs.registerProjection(AnotherViews, 'AnotherViews')

  class ThirdProjection extends AbstractProjection {
    constructor({ eventStore }) {
      super({
        eventStore,
        view: new MongoView({
          collection: ThirdProjectionCollection,
          ObjectId
        })
      })
    }

    get handles() {
      return ['EventCreated']
    }

    get shouldRestoreView() {
      return false
    }

    EventCreated({ aggregateId, payload }) {
      this.view.create(aggregateId, Object.assign({ name: this.name }, payload))
    }
  }
  cqrs.registerProjection(ThirdProjection, 'ThirdProjection')

  /**
   * create instances for DI
   * @todo find out about Unexposed vs. All
   */
  cqrs.createUnexposedInstances()
  cqrs.createAllInstances()

  return { cqrs, eventsCollection, viewsCollection, snapshotsCollection }
}

module.exports = {
  createDomain
}
