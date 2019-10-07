'use strict'

/**
 * In-memory storage for aggregate snapshots.
 * Storage content resets on app restart
 *
 * @class InMemorySnapshotStorage
 * @implements {IAggregateSnapshotStorage}
 */
module.exports = class MongoSnapshotStorage {
  /**
   * Creates an instance of InMemorySnapshotStorage
   * @memberof InMemorySnapshotStorage
   */
  constructor() {
    console.log('--------------------> mongo snapshots')
    this._snapshots = new Map()
  }

  /**
   * Get latest aggregate snapshot
   *
   * @param {Identifier} aggregateId
   * @returns {Promise<IEvent>}
   * @memberof InMemorySnapshotStorage
   */
  async getAggregateSnapshot(aggregateId) {
    return this._snapshots.get(aggregateId)
  }

  /**
   * Save new aggregate snapshot
   *
   * @param {IEvent} snapshotEvent
   * @memberof InMemorySnapshotStorage
   */
  async saveAggregateSnapshot(snapshotEvent) {
    this._snapshots.set(snapshotEvent.aggregateId, snapshotEvent)
  }
}
