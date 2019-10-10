const { MongoClient, ObjectId } = require('mongodb')
const {
  Container,
  AbstractAggregate,
  AbstractProjection,
  MongoView,
  MongoEventStorage
} = require('../index')
const { config } = require('./helper')

const createDomain = async (t, ns = '') => {
  const client = await MongoClient.connect(config.mongoUri)
  const db = client.db()
  const eventsCollection = db.collection(`${ns}events-test-1`)
  const viewsCollection = db.collection(`${ns}views-test-1`)

  try {
    await eventsCollection.drop()
    await viewsCollection.drop()
  } catch (_) {}

  t.teardown(async () => {
    console.log('teardown')
    // await wait(100)
    await client.close()
  })

  const cqrs = new Container()

  cqrs.register(MongoEventStorage, 'storage')
  cqrs.registerInstance(eventsCollection, 'EventsCollection')
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
      // console.log('shouldTakeSnapshot', this.version, this.snapshotVersion)
      return this.version - this.snapshotVersion > 10
    }

    createEvent(payload) {
      this.emit('EventCreated', payload)
    }

    changeEvent(payload) {
      this.emit('EventChanged', payload)
    }

    deleteEvent() {
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

  return { cqrs, eventsCollection, viewsCollection }
}

module.exports = {
  createDomain
}
