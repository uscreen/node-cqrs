'use strict'

const uuidv4 = require('uuid/v4')

module.exports = class MongoEventStorage {
  constructor({ EventsCollection }) {
    this.collection = EventsCollection
    this.collection.createIndex(
      { aggregateId: 1, aggregateVersion: 1 },
      { unique: true, sparse: true }
    )
    this.collection.createIndex(
      { sagaId: 1, sagaVersion: 1 },
      { unique: false, sparse: true }
    )
    this.collection.createIndex({ type: 1 }, { unique: false, sparse: true })
  }

  wrapEvent(event) {
    const evt = Object.assign({}, event)
    return evt
  }

  commitEvents(eventStream) {
    const events = eventStream.map(this.wrapEvent.bind(this))
    return this.collection.insertMany(events, { w: 1 })
  }

  getAggregateEvents(aggregateId, { snapshot }) {
    const query = {
      aggregateId: aggregateId
    }

    if (snapshot && snapshot.aggregateVersion) {
      query.aggregateVersion = {
        $gt: snapshot.aggregateVersion
      }
    }

    return this.collection
      .find(query, {
        projection: { _id: false },
        sort: 'aggregateVersion'
      })
      .toArray()
  }

  getSagaEvents(sagaId, { beforeEvent }) {
    const query = {
      sagaId: sagaId
    }

    /* istanbul ignore if */
    if (beforeEvent && beforeEvent.sagaVersion) {
      query.sagaVersion = {
        $lt: beforeEvent.sagaVersion
      }
    }

    return this.collection
      .find(query, {
        projection: { _id: false },
        sort: 'sagaVersion'
      })
      .toArray()
  }

  getEvents(eventTypes) {
    const query = {
      type: { $in: eventTypes }
    }
    return this.collection
      .find(query, {
        projection: { _id: false },
        sort: 'aggregateVersion'
      })
      .toArray()
  }

  getNewId() {
    return uuidv4()
  }
}
