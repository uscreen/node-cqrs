'use strict'

module.exports = class MongoSnapshotStorage {
  /**
   * Creates an instance of MongoSnapshotStorage
   */
  constructor({ ObjectId, SnapshotsCollection }) {
    this.ObjectId = ObjectId
    this.collection = SnapshotsCollection
  }

  /**
   * Get latest aggregate snapshot
   */
  async getAggregateSnapshot(aggregateId) {
    return this.collection.findOne({ _id: this.ObjectId(aggregateId) })
  }

  wrapEvent(event) {
    const evt = Object.assign({}, event)
    /* istanbul ignore else */
    if (evt.aggregateId) {
      evt.aggregateId = this.ObjectId(evt.aggregateId)
    }

    delete evt.state
    return evt
  }

  /**
   * Save new aggregate snapshot
   */
  async saveAggregateSnapshot(snapshotEvent) {
    await this.collection.findOneAndUpdate(
      { _id: this.ObjectId(snapshotEvent.aggregateId) },
      { $set: this.wrapEvent(snapshotEvent) },
      { returnOriginal: false, upsert: true }
    )
  }
}
