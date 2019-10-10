const { MongoClient, ObjectId } = require('mongodb')
const {
  Container,
  AbstractAggregate,
  AbstractProjection,
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

  try {
    await eventsCollection.drop()
    await snapshotsCollection.drop()
    await viewsCollection.drop()
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
