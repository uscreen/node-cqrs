'use strict'

module.exports = class MongoEventStorage {
  constructor({ EventsCollection }) {
    this.collection = EventsCollection
    this.createIndex()
  }

  /**
   * creating indecies now (mongodb >= 3.5.x) requires
   * awaiting the promise, constructor can't be async, so..
   */
  async createIndex() {
    await this.collection
      .createIndex(
        { aggregateId: 1, aggregateVersion: 1 },
        { unique: true, sparse: true }
      )
      .catch((e) => {})
    await this.collection
      .createIndex(
        { sagaId: 1, sagaVersion: 1 },
        { unique: false, sparse: true }
      )
      .catch((e) => {})
    await this.collection
      .createIndex({ type: 1 }, { unique: false, sparse: true })
      .catch((e) => {})
  }

  commitEvents(events) {
    if (events.length) {
      return this.collection.insertMany(events, { w: 1 })
    }
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

    /* istanbul ignore if: @TODO needs test with beforeEvent.sagaVersion > 0 */
    if (beforeEvent) {
      query.sagaVersion = {
        $lt: beforeEvent.sagaVersion || 0
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
}
