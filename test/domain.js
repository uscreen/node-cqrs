const { MongoClient, ObjectId } = require('mongodb')
const {
  Container,
  AbstractAggregate,
  AbstractProjection,
  MongoView,
  MongoEventStorage
} = require('../index')
const { config } = require('./helper')

let client

const createDomain = async () => {
  client = await MongoClient.connect(config.mongoUri)
  const db = client.db()
  const eventsCollection = db.collection('events-test-1')
  const viewsCollection = db.collection('views-test-1')

  try {
    await eventsCollection.drop()
    await viewsCollection.drop()
  } catch (_) {}

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

const closeDb = () => {
  client.close()
}

module.exports = {
  createDomain,
  closeDb
}
