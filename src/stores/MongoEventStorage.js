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
    evt.aggregateId = this.ObjectId(evt.aggregateId)
    return evt
  }

  commitEvents(eventStream) {
    const events = eventStream.map(this.wrapEvent.bind(this))
    return this.collection.insertMany(events)
  }

  getAggregateEvents(aggregateId, { snapshot } = {}) {
    return this.collection
      .find(
        {
          aggregateId: this.ObjectId(aggregateId)
        },
        {
          projection: { _id: false },
          sort: 'aggregateVersion'
        }
      )
      .toArray()
  }

  getSagaEvents(sagaId, { beforeEvent }) {
    console.log('getSagaEvents', sagaId)
    // return this._events.then(events =>
    //   events.filter(
    //     e => e.sagaId == sagaId && e.sagaVersion < beforeEvent.sagaVersion
    //   )
    // )
  }

  /**
   * @todo check options on direct streaming from mongo
   * @todo when used?
   */
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
