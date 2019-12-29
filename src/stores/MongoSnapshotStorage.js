'use strict'

module.exports = class MongoSnapshotStorage {
  /**
   * Creates an instance of MongoSnapshotStorage
   */
  constructor({ SnapshotsCollection }) {
    this.collection = SnapshotsCollection
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

  /**
   * Get latest aggregate snapshot
   */
  async getAggregateSnapshot(aggregateId) {
    return this.collection.findOne(
      { aggregateId: aggregateId },
      { sort: { aggregateVersion: -1 } }
    )
  }

  wrapEvent(event) {
    const evt = Object.assign({}, event)
    return evt
  }

  /**
   * Save new aggregate snapshot
   */
  async saveAggregateSnapshot(snapshotEvent) {
    return this.collection.insertOne(this.wrapEvent(snapshotEvent))
  }
}
