'use strict'

module.exports = class MongoEventStorage {
  constructor({ ObjectId, EventsCollection }) {
    this.ObjectId = ObjectId
    this.collection = EventsCollection
    this.collection.createIndex(
      { aggregateId: 1, aggregateVersion: 1 },
      { unique: true, sparse: true }
    )
    this.collection.createIndex(
      { sagaId: 1, sagaVersion: 1 },
      { unique: false, sparse: true }
    )
  }

  wrapEvent(event) {
    const evt = Object.assign({}, event)
    /* istanbul ignore else */
    if (evt.aggregateId) {
      evt.aggregateId = this.ObjectId(evt.aggregateId)
    }
    /* istanbul ignore else */
    if (evt.sagaId) {
      evt.sagaId = this.ObjectId(evt.sagaId)
    }
    return evt
  }

  commitEvents(eventStream) {
    const events = eventStream.map(this.wrapEvent.bind(this))
    return this.collection.insertMany(events, { w: 1 })
  }

  getAggregateEvents(aggregateId, { snapshot }) {
    const query = {
      aggregateId: this.ObjectId(aggregateId)
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
      sagaId: this.ObjectId(sagaId)
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

  /**
   * @todo when used?
   */
  /* istanbul ignore next */
  getEvents(eventTypes, filter) {
    console.log('getEvents', eventTypes, filter)
    return []
    // if (!eventTypes) return this._events
    // return this._events.then(events =>
    //   events.filter(e => eventTypes.includes(e.type))
    // )
  }

  getNewId() {
    return new this.ObjectId()
  }
}
