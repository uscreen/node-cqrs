const { MongoClient, ObjectId } = require('mongodb')
const {
  Container,
  AbstractAggregate,
  AbstractProjection,
  AbstractSaga,
  MongoView,
  MongoEventStorage,
  MongoSnapshotStorage
} = require('../index')
const { config, wait } = require('./helper')

const createDomain = async (t, ns = '', { skipSnapshot } = {}) => {
  const client = await MongoClient.connect(config.mongoUri)
  const db = client.db()
  const eventsCollection = db.collection(`${ns}events-test-1`)
  const snapshotsCollection = db.collection(`${ns}snapshots-test-1`)
  const viewsCollection = db.collection(`${ns}views-test-1`)
  const anotherViewsCollection = db.collection(`${ns}another-views-test-1`)
  const ThirdProjectionCollection = db.collection(
    `${ns}ThirdProjection-views-test-1`
  )

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

  const cqrs = new Container()

  cqrs.register(MongoEventStorage, 'storage')
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
    get state() {
      return this._state || (this._state = new State())
    }

    get shouldTakeSnapshot() {
      return this.version - this.snapshotVersion > 10
    }

    createEvent(payload) {
      this.emit('EventCreated', payload)
    }

    changeEvent(payload) {
      this.emit('EventChanged', payload)
    }

    async deleteEvent() {
      await wait(10)
      this.emit('EventDeleted')
    }
  }
  cqrs.registerAggregate(Aggregate)

  class Views extends AbstractProjection {
    get view() {
      return (
        this._view ||
        (this._view = new MongoView({
          collection: viewsCollection,
          ObjectId
        }))
      )
    }

    get shouldRestoreView() {
      return false
    }

    EventCreated({ aggregateId, payload }) {
      this.view.create(aggregateId, payload)
    }

    EventChanged({ aggregateId, payload }) {
      this.view.update(aggregateId, payload)
    }

    EventDeleted({ aggregateId }) {
      this.view.delete(aggregateId)
    }
  }
  cqrs.registerProjection(Views, 'Views')

  class AnotherViews extends AbstractProjection {
    get view() {
      return (
        this._view ||
        (this._view = new MongoView({
          collection: anotherViewsCollection,
          ObjectId
        }))
      )
    }

    static get handles() {
      return ['EventCreated', 'EventChanged']
    }

    get shouldRestoreView() {
      return false
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
    get view() {
      return (
        this._view ||
        (this._view = new MongoView({
          collection: ThirdProjectionCollection,
          ObjectId
        }))
      )
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
   * add a saga
   */

  class Saga extends AbstractSaga {
    static get startsWith() {
      return ['EventCreated']
    }

    EventCreated(event) {
      console.log('-------------> somethingHappened', event)
      // super.enqueue('doSomething', undefined, { foo: 'bar' })
    }

    onError(error, { command, event }) {
      console.log('onError', error)
      // super.enqueue('fixError', undefined, { error, command, event })
    }
  }
  cqrs.registerSaga(Saga)

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