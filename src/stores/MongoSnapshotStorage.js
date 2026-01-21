'use strict'

module.exports = class MongoSnapshotStorage {
  /**
   * Creates an instance of MongoSnapshotStorage
   */
  constructor({ SnapshotsCollection }) {
    this.collection = SnapshotsCollection
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

  /**
   * Get latest aggregate snapshot
   */
  async getAggregateSnapshot(aggregateId) {
    return this.collection.findOne(
      { aggregateId },
      { sort: { aggregateVersion: -1 } }
    )
  }

  /**
   * Save new aggregate snapshot
   */
  async saveAggregateSnapshot(snapshotEvent) {
    return this.collection.insertOne(snapshotEvent)
  }
}
