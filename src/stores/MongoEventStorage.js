/* eslint no-return-assign: "off", eqeqeq: "off", require-jsdoc: "off" */
'use strict'

function wrapEvent(event) {
  return Object.assign({}, event)
}

/**
 * A simple event storage implementation intended to use for tests only.
 * Storage content resets on each app restart.
 *
 * @class InMemoryEventStorage
 * @implements {IEventStorage}
 */
module.exports = class MongoEventStorage {
  constructor(MongoEventStorageConfig) {
    console.log('--------------------> mongo event')

    this.ObjectId = MongoEventStorageConfig.ObjectId
    this.collection = MongoEventStorageConfig.events

    this.collection.createIndex(
      { aggregateId: 1, aggregateVersion: 1 },
      { unique: true, sparse: true }
    )
    this.collection.createIndex(
      { sagaId: 1, sagaVersion: 1 },
      { unique: false, sparse: true }
    )
  }

  commitEvents(eventStream) {
    const events = eventStream.map(wrapEvent)
    return this.collection.insertMany(events)
  }

  async getAggregateEvents(aggregateId, { snapshot } = {}) {
    console.log('getAggregateEvents', aggregateId)
    // const events = await this._events
    // if (snapshot)
    //   return events.filter(
    //     e =>
    //       e.aggregateId == aggregateId &&
    //       e.aggregateVersion > snapshot.aggregateVersion
    //   )
    // return events.filter(e => e.aggregateId == aggregateId)
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
