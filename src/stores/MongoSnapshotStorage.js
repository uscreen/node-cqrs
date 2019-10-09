'use strict'

module.exports = class MongoSnapshotStorage {
  /**
   * Creates an instance of MongoSnapshotStorage
   */
  constructor() {
    console.log('--------------------> mongo snapshots')
    this._snapshots = new Map()
  }

  /**
   * Get latest aggregate snapshot
   */
  async getAggregateSnapshot(aggregateId) {
    return this._snapshots.get(aggregateId)
  }

  /**
   * Save new aggregate snapshot
   */
  async saveAggregateSnapshot(snapshotEvent) {
    this._snapshots.set(snapshotEvent.aggregateId, snapshotEvent)
  }
}
